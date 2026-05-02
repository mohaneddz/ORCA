// vSphere REST API client.
// Handles session auth, request wrapping, and error normalization.
//
// SECURITY NOTE: For production, do NOT call vCenter directly from the browser.
// Expose vCenter credentials only through a backend proxy (server/api/vmware/*).
// The frontend should call /api/vmware/* which proxies to vCenter.
//
// TLS NOTE: Self-signed vCenter certificates will be rejected by browsers.
// In a Tauri app, configure the Tauri HTTP plugin to disable TLS verification
// for intranet vCenter hosts, or use a trusted certificate.

const BASE_URL = import.meta.env.VITE_VMWARE_VCENTER_URL ?? "https://vcenter.example.local";
const USERNAME = import.meta.env.VITE_VMWARE_USERNAME ?? "";
const PASSWORD = import.meta.env.VITE_VMWARE_PASSWORD ?? "";

let sessionId: string | null = null;

export class VsphereError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "VsphereError";
  }
}

// ─── Session management ───────────────────────────────────────────────────────

/**
 * POST /api/session  –  Basic auth → returns session ID string.
 */
export async function login(): Promise<void> {
  const credentials = btoa(`${USERNAME}:${PASSWORD}`);
  const resp = await fetch(`${BASE_URL}/api/session`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) {
    throw new VsphereError(
      `vCenter login failed: ${resp.status} ${resp.statusText}`,
      resp.status,
    );
  }

  sessionId = (await resp.json()) as string;
}

export async function logout(): Promise<void> {
  if (!sessionId) return;
  await fetch(`${BASE_URL}/api/session`, {
    method: "DELETE",
    headers: { "vmware-api-session-id": sessionId },
  }).catch(() => {});
  sessionId = null;
}

// ─── Authenticated request wrapper ────────────────────────────────────────────

async function ensureSession(): Promise<void> {
  if (!sessionId) await login();
}

export async function vsphereGet<T>(path: string): Promise<T> {
  await ensureSession();

  const resp = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "vmware-api-session-id": sessionId!,
      "Content-Type": "application/json",
    },
  });

  if (resp.status === 401) {
    sessionId = null;
    await ensureSession();
    return vsphereGet<T>(path);
  }

  if (!resp.ok) {
    let body: unknown;
    try { body = await resp.json(); } catch { body = undefined; }
    throw new VsphereError(
      `vSphere API error ${resp.status} at ${path}`,
      resp.status,
      body,
    );
  }

  return resp.json() as Promise<T>;
}

export async function vspherePost<T>(path: string, data?: unknown): Promise<T> {
  await ensureSession();

  const resp = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "vmware-api-session-id": sessionId!,
      "Content-Type": "application/json",
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

  if (resp.status === 401) {
    sessionId = null;
    await ensureSession();
    return vspherePost<T>(path, data);
  }

  if (!resp.ok) {
    let body: unknown;
    try { body = await resp.json(); } catch { body = undefined; }
    throw new VsphereError(
      `vSphere API error ${resp.status} at ${path}`,
      resp.status,
      body,
    );
  }

  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}

// ─── Raw API shapes (internal only) ──────────────────────────────────────────

export interface RawVm {
  vm: string;
  name: string;
  power_state: string;
  cpu_count?: number;
  memory_size_MiB?: number;
}

export interface RawHost {
  host: string;
  name: string;
  connection_state: string;
}

export interface RawCluster {
  cluster: string;
  name: string;
  drs_enabled?: boolean;
  ha_enabled?: boolean;
}

export interface RawDatastore {
  datastore: string;
  name: string;
  type?: string;
  capacity?: number;
  free_space?: number;
}

export interface RawVmCpu {
  count: number;
  cores_per_socket: number;
  hot_add_enabled?: boolean;
}

export interface RawVmMemory {
  size_MiB: number;
  hot_add_enabled?: boolean;
}

export interface RawVmPower {
  state: string;
}

export interface RawVmDisk {
  disk: string;
  label?: string;
  capacity?: number;
  backing?: { vmdk_file?: string; datastore?: string };
  scsi?: { bus: number; unit: number };
  sata?: { bus: number; unit: number };
}

export interface RawResourcePool {
  resource_pool: string;
  name: string;
}
