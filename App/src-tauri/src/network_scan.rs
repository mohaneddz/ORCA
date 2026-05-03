use chrono::Utc;
use futures::stream::{self, StreamExt};
use local_ip_address::local_ip;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::process::Stdio;
use std::str::FromStr;
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio::process::Command;
use tokio::sync::Semaphore;
use tokio::time::{timeout, Duration};

const COMMON_PORTS: [u16; 17] = [
    22, 53, 80, 139, 443, 445, 554, 631, 1900, 3306, 3389, 5353, 5357, 5432, 8008, 8080, 9100,
];

const MAX_HOSTS_TO_SCAN: usize = 1024;
const REACHABILITY_CONCURRENCY: usize = 64;
const PORT_SCAN_CONCURRENCY: usize = 64;
const CONNECT_TIMEOUT_MS: u64 = 350;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceRecord {
    pub ip: String,
    pub mac: Option<String>,
    pub hostname: Option<String>,
    pub vendor: Option<String>,
    pub device_type: String,
    pub connection: Option<String>,
    pub ssid: Option<String>,
    pub ap: Option<String>,
    pub switch_port: Option<String>,
    pub vlan: Option<String>,
    pub open_ports: Vec<u16>,
    pub services: Vec<String>,
    pub source_evidence: Vec<String>,
    pub first_seen: String,
    pub last_seen: String,
    pub bandwidth_down_mbps: Option<f32>,
    pub bandwidth_up_mbps: Option<f32>,
    pub risk_flags: Vec<String>,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RouterMockData {
    pub dhcp_leases: Vec<RouterClient>,
    pub arp_table: Vec<RouterClient>,
    pub wifi_clients: Vec<RouterWifiClient>,
    pub dns_records: Vec<RouterDnsRecord>,
    pub bandwidth_stats: Vec<RouterBandwidth>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RouterClient {
    pub ip: String,
    pub mac: String,
    pub hostname: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RouterWifiClient {
    pub ip: String,
    pub mac: String,
    pub ssid: String,
    pub ap: String,
    pub rssi: i32,
    pub switch_port: Option<String>,
    pub vlan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RouterDnsRecord {
    pub ip: String,
    pub hostname: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RouterBandwidth {
    pub ip: String,
    pub down_mbps: f32,
    pub up_mbps: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalNetworkInfo {
    pub local_ip: String,
    pub cidr: String,
    pub subnet_mask: String,
    pub gateway_guess: String,
    pub private_range_allowed: bool,
    pub host_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanNetworkResponse {
    pub info: LocalNetworkInfo,
    pub discovered_count: usize,
    pub devices: Vec<DeviceRecord>,
}

#[tauri::command]
pub async fn get_router_mock_data() -> Result<RouterMockData, String> {
    Ok(build_neighbor_data())
}

#[tauri::command]
pub async fn get_local_network_info() -> Result<LocalNetworkInfo, String> {
    build_local_network_info()
}

#[tauri::command]
pub async fn scan_common_ports(ip: String) -> Result<Vec<u16>, String> {
    let ip_addr: IpAddr = ip.parse().map_err(|_| "invalid IP address".to_string())?;
    if !is_private_ip(&ip_addr) {
        return Err("only RFC1918/private IP ranges are allowed".to_string());
    }
    Ok(scan_ports_for_ip(ip_addr, &COMMON_PORTS).await)
}

#[tauri::command]
pub async fn discover_devices() -> Result<Vec<DeviceRecord>, String> {
    Ok(scan_network().await?.devices)
}

#[tauri::command]
pub async fn scan_network() -> Result<ScanNetworkResponse, String> {
    let info = build_local_network_info()?;
    if !info.private_range_allowed {
        return Err("local interface is not in an RFC1918/private range".to_string());
    }

    let local_ip = IpAddr::from_str(&info.local_ip).map_err(|e| e.to_string())?;
    let hosts = generate_hosts_from_cidr(&info.cidr)?;

    // Trigger lightweight reachability probes to populate ARP cache and find live nodes.
    probe_hosts_reachability(&hosts).await;

    let mut arp_rows = read_arp_table().await;
    if !arp_rows.iter().any(|(ip, _)| *ip == local_ip) {
        arp_rows.push((local_ip, None));
    }

    let router_mock = build_neighbor_data();
    let mut map: HashMap<String, DeviceRecord> = HashMap::new();
    let now = Utc::now().to_rfc3339();

    for (ip, mac) in arp_rows {
        if !is_private_ip(&ip) {
            continue;
        }
        upsert_device(
            &mut map,
            &ip.to_string(),
            mac,
            vec!["arp_table".to_string()],
            now.clone(),
        );
    }

    merge_neighbor_data(&mut map, &router_mock, &now);

    let target_ips: Vec<IpAddr> = map
        .keys()
        .filter_map(|k| k.parse::<IpAddr>().ok())
        .collect();

    let semaphore = Arc::new(Semaphore::new(16));
    let scanned = stream::iter(target_ips)
        .map(|ip| {
            let sem = semaphore.clone();
            async move {
                let _permit = sem.acquire().await.ok();
                let open_ports = scan_ports_for_ip(ip, &COMMON_PORTS).await;
                let hostname = reverse_dns_lookup(ip).await;
                (ip, open_ports, hostname)
            }
        })
        .buffer_unordered(16)
        .collect::<Vec<_>>()
        .await;

    for (ip, ports, hostname) in scanned {
        if let Some(dev) = map.get_mut(&ip.to_string()) {
            if !ports.is_empty() {
                dev.source_evidence.push("port_scan".to_string());
            }
            dev.open_ports = ports.clone();
            dev.services = ports.iter().map(|p| map_port_to_service(*p)).collect();
            if dev.hostname.is_none() {
                dev.hostname = hostname;
            }
            enrich_device(dev);
            dev.last_seen = Utc::now().to_rfc3339();
        }
    }

    let mut devices: Vec<DeviceRecord> = map.into_values().collect();
    devices.sort_by(|a, b| a.ip.cmp(&b.ip));

    Ok(ScanNetworkResponse {
        discovered_count: devices.len(),
        info,
        devices,
    })
}

fn build_local_network_info() -> Result<LocalNetworkInfo, String> {
    let ip = local_ip().map_err(|e| format!("failed to resolve local IP: {e}"))?;
    let ip_v4 = match ip {
        IpAddr::V4(v4) => v4,
        IpAddr::V6(_) => return Err("IPv6-only host is not supported in this scanner".to_string()),
    };

    let mask = detect_subnet_mask_for_ip(ip_v4).unwrap_or(Ipv4Addr::new(255, 255, 255, 0));
    let prefix = mask_to_prefix(mask);
    let network = ipv4_to_u32(ip_v4) & ipv4_to_u32(mask);
    let network_ip = u32_to_ipv4(network);
    let cidr = format!("{network_ip}/{prefix}");
    let host_count = usable_host_count(prefix);

    Ok(LocalNetworkInfo {
        local_ip: ip_v4.to_string(),
        cidr,
        subnet_mask: mask.to_string(),
        gateway_guess: format!("{}.{}.{}.1", ip_v4.octets()[0], ip_v4.octets()[1], ip_v4.octets()[2]),
        private_range_allowed: is_private_ip(&IpAddr::V4(ip_v4)),
        host_count,
    })
}

/// Build neighbor data from real OS sources (Windows Neighbor Table + optional DHCP).
/// Returns empty collections for data that requires router-level access.
fn build_neighbor_data() -> RouterMockData {
    RouterMockData {
        dhcp_leases: query_dhcp_leases(),
        arp_table: vec![],  // ARP is already handled by read_arp_table()
        wifi_clients: vec![],
        dns_records: query_net_neighbors(),
        bandwidth_stats: vec![],
    }
}

#[cfg(target_os = "windows")]
fn query_net_neighbors() -> Vec<RouterDnsRecord> {
    use std::process::Command as StdCommand;
    let Ok(output) = StdCommand::new("powershell")
        .args(["-NoProfile", "-Command", "Get-NetNeighbor -State Reachable | Select-Object IPAddress | ConvertTo-Csv -NoTypeInformation"])
        .output()
    else {
        return Vec::new();
    };
    let text = String::from_utf8_lossy(&output.stdout);
    let mut records = Vec::new();
    let mut skip_header = true;
    for line in text.lines() {
        if skip_header { skip_header = false; continue; }
        let ip = line.trim().trim_matches('"').to_string();
        if ip.is_empty() || ip.starts_with("//") { continue; }
        records.push(RouterDnsRecord { ip, hostname: String::new() });
    }
    records
}

#[cfg(not(target_os = "windows"))]
fn query_net_neighbors() -> Vec<RouterDnsRecord> {
    Vec::new()
}

#[cfg(target_os = "windows")]
fn query_dhcp_leases() -> Vec<RouterClient> {
    use std::process::Command as StdCommand;
    // Only succeeds when this machine is a Windows DHCP server; returns empty otherwise.
    let Ok(output) = StdCommand::new("netsh")
        .args(["dhcp", "server", "scope", "show", "clients"])
        .output()
    else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let mut leases = Vec::new();
    for line in text.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 { continue; }
        let ip = parts[0];
        let mac = parts[2];
        if ip.contains('.') && mac.contains('-') {
            leases.push(RouterClient {
                ip: ip.to_string(),
                mac: mac.replace('-', ":").to_lowercase(),
                hostname: parts.get(4).map(|s| s.to_string()),
            });
        }
    }
    leases
}

#[cfg(not(target_os = "windows"))]
fn query_dhcp_leases() -> Vec<RouterClient> {
    Vec::new()
}

fn merge_neighbor_data(map: &mut HashMap<String, DeviceRecord>, router: &RouterMockData, now: &str) {
    for lease in &router.dhcp_leases {
        upsert_device(map, &lease.ip, Some(lease.mac.clone()), vec!["router_dhcp".into()], now.to_string());
        if let Some(dev) = map.get_mut(&lease.ip) {
            if dev.hostname.is_none() {
                dev.hostname = lease.hostname.clone();
            }
        }
    }

    for row in &router.arp_table {
        upsert_device(map, &row.ip, Some(row.mac.clone()), vec!["router_arp".into()], now.to_string());
        if let Some(dev) = map.get_mut(&row.ip) {
            if dev.hostname.is_none() {
                dev.hostname = row.hostname.clone();
            }
        }
    }

    for wifi in &router.wifi_clients {
        upsert_device(map, &wifi.ip, Some(wifi.mac.clone()), vec!["router_wifi".into()], now.to_string());
        if let Some(dev) = map.get_mut(&wifi.ip) {
            dev.connection = Some("wifi".into());
            dev.ssid = Some(wifi.ssid.clone());
            dev.ap = Some(wifi.ap.clone());
            if dev.switch_port.is_none() {
                dev.switch_port = wifi.switch_port.clone();
            }
            if dev.vlan.is_none() {
                dev.vlan = wifi.vlan.clone();
            }
        }
    }

    for dns in &router.dns_records {
        upsert_device(map, &dns.ip, None, vec!["router_dns".into()], now.to_string());
        if let Some(dev) = map.get_mut(&dns.ip) {
            if dev.hostname.is_none() {
                dev.hostname = Some(dns.hostname.clone());
            }
        }
    }

    for bw in &router.bandwidth_stats {
        upsert_device(map, &bw.ip, None, vec!["router_bandwidth".into()], now.to_string());
        if let Some(dev) = map.get_mut(&bw.ip) {
            dev.bandwidth_down_mbps = Some(bw.down_mbps);
            dev.bandwidth_up_mbps = Some(bw.up_mbps);
        }
    }
}

fn upsert_device(
    map: &mut HashMap<String, DeviceRecord>,
    ip: &str,
    mac: Option<String>,
    evidence: Vec<String>,
    now: String,
) {
    let entry = map.entry(ip.to_string()).or_insert(DeviceRecord {
        ip: ip.to_string(),
        mac: None,
        hostname: None,
        vendor: None,
        device_type: "unknown".into(),
        connection: None,
        ssid: None,
        ap: None,
        switch_port: None,
        vlan: None,
        open_ports: vec![],
        services: vec![],
        source_evidence: vec![],
        first_seen: now.clone(),
        last_seen: now,
        bandwidth_down_mbps: None,
        bandwidth_up_mbps: None,
        risk_flags: vec![],
        confidence: 0.2,
    });

    if entry.mac.is_none() {
        entry.mac = mac;
    }
    entry.source_evidence.extend(evidence);
    entry.source_evidence.sort();
    entry.source_evidence.dedup();
}

fn enrich_device(device: &mut DeviceRecord) {
    if let Some(mac) = &device.mac {
        device.vendor = lookup_vendor(mac);
    }

    let lower_name = device
        .hostname
        .as_deref()
        .unwrap_or_default()
        .to_ascii_lowercase();

    device.device_type = infer_device_type(&device.open_ports, &lower_name, device.vendor.as_deref());

    let mut flags = Vec::new();
    if device.open_ports.contains(&80) || device.open_ports.contains(&8080) {
        flags.push("exposed_admin_panel".to_string());
    }
    if device.open_ports.contains(&631) || device.open_ports.contains(&9100) {
        flags.push("printer_detected".to_string());
    }
    if device.open_ports.contains(&445) || device.open_ports.contains(&139) {
        flags.push("smb_open".to_string());
    }
    if device.open_ports.contains(&3389) {
        flags.push("rdp_open".to_string());
    }
    if device.open_ports.iter().any(|p| [3306, 5432].contains(p)) {
        flags.push("database_port_open".to_string());
    }

    let has_router_data = device.source_evidence.iter().any(|e| e.starts_with("router_"));
    let has_scan_data = device.source_evidence.iter().any(|e| e == "arp_table" || e == "port_scan");

    if !has_router_data {
        flags.push("scan_only_device".to_string());
    }
    if !has_scan_data {
        flags.push("router_only_device".to_string());
    }
    if device.device_type == "unknown" {
        flags.push("unknown_device".to_string());
    }

    let mut confidence = 0.2_f32;
    confidence += (device.source_evidence.len() as f32 * 0.1).min(0.4);
    if device.mac.is_some() {
        confidence += 0.15;
    }
    if device.hostname.is_some() {
        confidence += 0.1;
    }
    if device.vendor.is_some() {
        confidence += 0.1;
    }

    if confidence < 0.5 {
        flags.push("low_confidence_identity".to_string());
    }

    device.risk_flags = flags;
    device.confidence = confidence.clamp(0.0, 1.0);
}

fn infer_device_type(open_ports: &[u16], hostname: &str, vendor: Option<&str>) -> String {
    if open_ports.contains(&631) || open_ports.contains(&9100) || hostname.contains("printer") {
        return "printer".into();
    }
    if open_ports.contains(&554) || hostname.contains("cam") || hostname.contains("camera") {
        return "camera".into();
    }
    if open_ports.contains(&3389) || open_ports.contains(&445) || hostname.contains("laptop") {
        return "workstation".into();
    }
    if open_ports.iter().any(|p| [3306, 5432].contains(p)) {
        return "database_server".into();
    }
    if open_ports.contains(&53) || hostname.contains("router") {
        return "network_infra".into();
    }
    if vendor.unwrap_or_default().to_ascii_lowercase().contains("samsung") || hostname.contains("tv") {
        return "iot_display".into();
    }
    "unknown".into()
}

fn lookup_vendor(mac: &str) -> Option<String> {
    let cleaned = mac.replace('-', ":").to_ascii_lowercase();
    let prefix = cleaned.split(':').take(3).collect::<Vec<_>>().join(":");
    let mut map = HashMap::new();
    map.insert("f4:f5:e8", "Ubiquiti");
    map.insert("b8:27:eb", "Raspberry Pi Foundation");
    map.insert("dc:a6:32", "Samsung Electronics");
    map.insert("00:1a:79", "Dell Inc.");
    map.insert("f0:18:98", "Apple, Inc.");
    map.get(prefix.as_str()).map(|s| (*s).to_string())
}

fn is_private_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            let [a, b, ..] = v4.octets();
            a == 10 || (a == 172 && (16..=31).contains(&b)) || (a == 192 && b == 168)
        }
        IpAddr::V6(_) => false,
    }
}

fn generate_hosts_from_cidr(cidr: &str) -> Result<Vec<IpAddr>, String> {
    let (network_str, prefix_str) = cidr.split_once('/').ok_or("invalid CIDR format")?;
    let network = network_str.parse::<Ipv4Addr>().map_err(|_| "invalid network IP")?;
    let prefix = prefix_str.parse::<u8>().map_err(|_| "invalid CIDR prefix")?;

    if prefix > 30 {
        return Err("CIDR too narrow for host scan".to_string());
    }

    let host_bits = 32 - prefix;
    let total = (1u64 << host_bits) as usize;
    let scan_count = total.saturating_sub(2).min(MAX_HOSTS_TO_SCAN);

    let base = ipv4_to_u32(network);
    let mut hosts = Vec::with_capacity(scan_count);
    for i in 1..=scan_count {
        hosts.push(IpAddr::V4(u32_to_ipv4(base + i as u32)));
    }
    Ok(hosts)
}

async fn probe_hosts_reachability(hosts: &[IpAddr]) {
    let semaphore = Arc::new(Semaphore::new(REACHABILITY_CONCURRENCY));
    let probe_ports = [80_u16, 443, 22, 53, 445];

    stream::iter(hosts.iter().copied())
        .map(|ip| {
            let sem = semaphore.clone();
            async move {
                let _permit = sem.acquire().await.ok();
                let _ = ping_host(ip).await;
                for p in probe_ports {
                    let _ = try_connect(ip, p).await;
                }
            }
        })
        .buffer_unordered(REACHABILITY_CONCURRENCY)
        .collect::<Vec<_>>()
        .await;
}

async fn ping_host(ip: IpAddr) -> bool {
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("ping");
        c.arg("-n").arg("1").arg("-w").arg("250").arg(ip.to_string());
        c
    } else {
        let mut c = Command::new("ping");
        c.arg("-c").arg("1").arg("-W").arg("1").arg(ip.to_string());
        c
    };

    cmd.stdout(Stdio::null()).stderr(Stdio::null());
    matches!(timeout(Duration::from_millis(900), cmd.status()).await, Ok(Ok(status)) if status.success())
}

async fn scan_ports_for_ip(ip: IpAddr, ports: &[u16]) -> Vec<u16> {
    let sem = Arc::new(Semaphore::new(PORT_SCAN_CONCURRENCY));
    let mut open = stream::iter(ports.iter().copied())
        .map(|port| {
            let sem = sem.clone();
            async move {
                let _permit = sem.acquire().await.ok();
                if try_connect(ip, port).await {
                    Some(port)
                } else {
                    None
                }
            }
        })
        .buffer_unordered(PORT_SCAN_CONCURRENCY)
        .collect::<Vec<_>>()
        .await
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();

    open.sort_unstable();
    open
}

async fn try_connect(ip: IpAddr, port: u16) -> bool {
    let addr = SocketAddr::new(ip, port);
    matches!(
        timeout(Duration::from_millis(CONNECT_TIMEOUT_MS), TcpStream::connect(addr)).await,
        Ok(Ok(_))
    )
}

async fn reverse_dns_lookup(ip: IpAddr) -> Option<String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("nslookup").arg(ip.to_string()).output().await.ok()?
    } else {
        Command::new("getent")
            .arg("hosts")
            .arg(ip.to_string())
            .output()
            .await
            .ok()?
    };

    if !output.status.success() {
        return None;
    }

    let raw = String::from_utf8_lossy(&output.stdout);
    if cfg!(target_os = "windows") {
        raw.lines()
            .find_map(|l| l.trim().strip_prefix("Name:").map(|v| v.trim().to_string()))
    } else {
        raw.split_whitespace().nth(1).map(|s| s.to_string())
    }
}

async fn read_arp_table() -> Vec<(IpAddr, Option<String>)> {
    let cmd_candidates = if cfg!(target_os = "windows") {
        vec![vec!["arp", "-a"]]
    } else {
        vec![vec!["ip", "neigh"], vec!["arp", "-a"]]
    };

    for cmd in cmd_candidates {
        if let Some(parsed) = run_and_parse_arp(&cmd).await {
            if !parsed.is_empty() {
                return parsed;
            }
        }
    }

    Vec::new()
}

async fn run_and_parse_arp(cmd: &[&str]) -> Option<Vec<(IpAddr, Option<String>)>> {
    let mut c = Command::new(cmd[0]);
    for arg in &cmd[1..] {
        c.arg(arg);
    }

    let out = c.output().await.ok()?;
    if !out.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    Some(parse_arp_output(&stdout))
}

fn parse_arp_output(stdout: &str) -> Vec<(IpAddr, Option<String>)> {
    let mut rows = Vec::new();
    let mut seen = HashSet::new();

    for line in stdout.lines() {
        let normalized = line.trim().replace('\t', " ");
        let parts: Vec<&str> = normalized.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        let ip = parts.iter().find_map(|t| t.parse::<IpAddr>().ok());
        let mac = parts.iter().find(|t| is_mac_like(t)).map(|m| m.replace('-', ":").to_ascii_lowercase());

        if let Some(ip) = ip {
            if seen.insert(ip) {
                rows.push((ip, mac));
            }
        }
    }

    rows
}

fn is_mac_like(value: &str) -> bool {
    let v = value.trim().to_ascii_lowercase();
    if v.len() < 11 {
        return false;
    }
    let sep = if v.contains(':') { ':' } else { '-' };
    let chunks: Vec<&str> = v.split(sep).collect();
    chunks.len() == 6 && chunks.iter().all(|c| c.len() == 2 && c.chars().all(|ch| ch.is_ascii_hexdigit()))
}

fn map_port_to_service(port: u16) -> String {
    match port {
        22 => "ssh",
        53 => "dns",
        80 => "http",
        139 => "netbios",
        443 => "https",
        445 => "smb",
        554 => "rtsp",
        631 => "ipp",
        1900 => "ssdp",
        3306 => "mysql",
        3389 => "rdp",
        5353 => "mdns",
        5357 => "ws-discovery",
        5432 => "postgresql",
        8008 => "http-alt",
        8080 => "http-proxy",
        9100 => "jetdirect",
        _ => "unknown",
    }
    .to_string()
}

fn detect_subnet_mask_for_ip(local_ip: Ipv4Addr) -> Option<Ipv4Addr> {
    if cfg!(target_os = "windows") {
        let output = std::process::Command::new("ipconfig").output().ok()?;
        let text = String::from_utf8_lossy(&output.stdout);

        let mut current_ip: Option<Ipv4Addr> = None;
        for line in text.lines() {
            if let Some(ip) = extract_ipv4(line) {
                current_ip = Some(ip);
            }
            if (line.contains("Subnet Mask") || line.contains("Subnetmaske")) && current_ip == Some(local_ip) {
                return extract_ipv4(line);
            }
        }
    }
    None
}

fn extract_ipv4(text: &str) -> Option<Ipv4Addr> {
    text.split(|c: char| c.is_whitespace() || c == ':' || c == '(' || c == ')')
        .find_map(|token| token.parse::<Ipv4Addr>().ok())
}

fn usable_host_count(prefix: u8) -> usize {
    if prefix >= 31 {
        return 0;
    }
    ((1_u64 << (32 - prefix)) - 2) as usize
}

fn ipv4_to_u32(ip: Ipv4Addr) -> u32 {
    u32::from_be_bytes(ip.octets())
}

fn u32_to_ipv4(value: u32) -> Ipv4Addr {
    Ipv4Addr::from(value.to_be_bytes())
}

fn mask_to_prefix(mask: Ipv4Addr) -> u8 {
    ipv4_to_u32(mask).count_ones() as u8
}
