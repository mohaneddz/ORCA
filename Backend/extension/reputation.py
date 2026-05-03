import csv
import io
import json
import threading
import time
from urllib.parse import urlsplit, urlunsplit

import requests
from django.conf import settings


SUPPORTED_SCHEMES = {"http", "https"}
SAFE_BROWSING_ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find"
MATCHED_SOURCE_POLICY = "policy_blacklist"
MATCHED_SOURCE_GOOGLE = "google_safe_browsing"
MATCHED_SOURCE_PHISHTANK = "phishtank"
MATCHED_SOURCE_OPENPHISH = "openphish"
MATCHED_SOURCE_URLHAUS = "urlhaus"


_FEED_CACHE_LOCK = threading.Lock()
_FEED_CACHE = {
    MATCHED_SOURCE_PHISHTANK: {"urls": set(), "hosts": set(), "fetched_at": 0.0, "last_error": ""},
    MATCHED_SOURCE_OPENPHISH: {"urls": set(), "hosts": set(), "fetched_at": 0.0, "last_error": ""},
    MATCHED_SOURCE_URLHAUS: {"urls": set(), "hosts": set(), "fetched_at": 0.0, "last_error": ""},
}


def _is_truthy(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _refresh_seconds(setting_name, default_value):
    try:
        value = int(getattr(settings, setting_name, default_value))
        return max(60, value)
    except (TypeError, ValueError):
        return default_value


def _request_timeout_seconds():
    try:
        timeout_ms = int(getattr(settings, "REPUTATION_CHECK_TIMEOUT_MS", 2000))
    except (TypeError, ValueError):
        timeout_ms = 2000
    return max(0.5, timeout_ms / 1000.0)


def _normalize_candidate_url(raw_url):
    value = str(raw_url or "").strip()
    if not value:
        return ""

    parsed = urlsplit(value)
    scheme = (parsed.scheme or "").lower()
    if scheme not in SUPPORTED_SCHEMES:
        return ""

    host = (parsed.hostname or "").lower().strip(".")
    if not host:
        return ""

    port = parsed.port
    netloc = host
    if port:
        default_port = 80 if scheme == "http" else 443
        if port != default_port:
            netloc = f"{host}:{port}"

    path = parsed.path or "/"
    query = parsed.query or ""
    return urlunsplit((scheme, netloc, path, query, ""))


def normalize_url_or_raise(raw_url):
    normalized = _normalize_candidate_url(raw_url)
    if not normalized:
        raise ValueError("A valid http/https URL is required.")
    return normalized


def _url_match_variants(normalized_url):
    variants = {normalized_url}
    parsed = urlsplit(normalized_url)

    no_query = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))
    variants.add(no_query)

    if parsed.path.endswith("/") and parsed.path != "/":
        variants.add(urlunsplit((parsed.scheme, parsed.netloc, parsed.path[:-1], "", "")))
    elif parsed.path != "/":
        variants.add(urlunsplit((parsed.scheme, parsed.netloc, parsed.path + "/", "", "")))

    return variants


def _hostname_matches(hostname, entries):
    if not hostname:
        return False
    return any(hostname == entry or hostname.endswith("." + entry) for entry in entries)


def _domains_from_settings():
    domains = getattr(
        settings,
        "EXTENSION_BLACKLIST_DOMAINS",
        ["malware-test.local", "credential-harvest-test.local", "eicar.org"],
    )
    cleaned = []
    for domain in domains:
        safe = str(domain or "").strip().lower().strip(".")
        if safe:
            cleaned.append(safe)
    return cleaned


def _parse_openphish_feed(text):
    urls = set()
    hosts = set()
    for line in text.splitlines():
        candidate = _normalize_candidate_url(line.strip())
        if not candidate:
            continue
        urls.add(candidate)
        host = (urlsplit(candidate).hostname or "").lower().strip(".")
        if host:
            hosts.add(host)
    return urls, hosts


def _parse_phishtank_feed(text):
    urls = set()
    hosts = set()
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        candidate = _normalize_candidate_url(row.get("url", "").strip())
        if not candidate:
            continue
        urls.add(candidate)
        host = (urlsplit(candidate).hostname or "").lower().strip(".")
        if host:
            hosts.add(host)
    return urls, hosts


def _parse_urlhaus_feed(text):
    urls = set()
    hosts = set()
    rows = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        rows.append(stripped)

    reader = csv.reader(rows)
    for row in reader:
        if len(row) < 3:
            continue
        candidate = _normalize_candidate_url(row[2].strip())
        if not candidate:
            continue
        urls.add(candidate)
        host = (urlsplit(candidate).hostname or "").lower().strip(".")
        if host:
            hosts.add(host)
    return urls, hosts


def _fetch_and_parse_feed(source_name):
    if source_name == MATCHED_SOURCE_PHISHTANK:
        url = getattr(
            settings,
            "REPUTATION_PHISHTANK_FEED_URL",
            "https://data.phishtank.com/data/online-valid.csv",
        )
        parser = _parse_phishtank_feed
    elif source_name == MATCHED_SOURCE_OPENPHISH:
        url = getattr(
            settings,
            "REPUTATION_OPENPHISH_FEED_URL",
            "https://openphish.com/feed.txt",
        )
        parser = _parse_openphish_feed
    elif source_name == MATCHED_SOURCE_URLHAUS:
        url = getattr(
            settings,
            "REPUTATION_URLHAUS_FEED_URL",
            "https://urlhaus.abuse.ch/downloads/csv_online/",
        )
        parser = _parse_urlhaus_feed
    else:
        return set(), set()

    response = requests.get(
        url,
        timeout=_request_timeout_seconds(),
        headers={"User-Agent": "CyberBaseWebGuard/1.0"},
    )
    response.raise_for_status()
    return parser(response.text)


def _is_feed_enabled(source_name):
    if source_name == MATCHED_SOURCE_PHISHTANK:
        return _is_truthy(getattr(settings, "REPUTATION_PHISHTANK_ENABLED", True), default=True)
    if source_name == MATCHED_SOURCE_OPENPHISH:
        return _is_truthy(getattr(settings, "REPUTATION_OPENPHISH_ENABLED", True), default=True)
    if source_name == MATCHED_SOURCE_URLHAUS:
        return _is_truthy(getattr(settings, "REPUTATION_URLHAUS_ENABLED", True), default=True)
    return False


def _feed_refresh_interval(source_name):
    if source_name == MATCHED_SOURCE_PHISHTANK:
        return _refresh_seconds("REPUTATION_PHISHTANK_REFRESH_SECONDS", 3600)
    if source_name == MATCHED_SOURCE_OPENPHISH:
        return _refresh_seconds("REPUTATION_OPENPHISH_REFRESH_SECONDS", 1800)
    if source_name == MATCHED_SOURCE_URLHAUS:
        return _refresh_seconds("REPUTATION_URLHAUS_REFRESH_SECONDS", 1800)
    return 3600


def _ensure_feed_snapshot(source_name):
    if not _is_feed_enabled(source_name):
        return {"urls": set(), "hosts": set()}, False

    degraded = False
    now = time.time()

    with _FEED_CACHE_LOCK:
        cache = _FEED_CACHE[source_name]
        current = {
            "urls": set(cache["urls"]),
            "hosts": set(cache["hosts"]),
            "fetched_at": float(cache["fetched_at"]),
        }

    refresh_interval = _feed_refresh_interval(source_name)
    needs_refresh = now - current["fetched_at"] >= refresh_interval or not current["urls"]
    if not needs_refresh:
        return {"urls": current["urls"], "hosts": current["hosts"]}, degraded

    try:
        urls, hosts = _fetch_and_parse_feed(source_name)
        with _FEED_CACHE_LOCK:
            _FEED_CACHE[source_name]["urls"] = set(urls)
            _FEED_CACHE[source_name]["hosts"] = set(hosts)
            _FEED_CACHE[source_name]["fetched_at"] = now
            _FEED_CACHE[source_name]["last_error"] = ""
        return {"urls": set(urls), "hosts": set(hosts)}, degraded
    except Exception as exc:
        degraded = True
        with _FEED_CACHE_LOCK:
            cached_urls = set(_FEED_CACHE[source_name]["urls"])
            cached_hosts = set(_FEED_CACHE[source_name]["hosts"])
            _FEED_CACHE[source_name]["last_error"] = str(exc)
        return {"urls": cached_urls, "hosts": cached_hosts}, degraded


def _google_safe_browsing_enabled():
    enabled = _is_truthy(
        getattr(settings, "REPUTATION_GOOGLE_SAFE_BROWSING_ENABLED", False),
        default=False,
    )
    api_key = str(getattr(settings, "GOOGLE_SAFE_BROWSING_API_KEY", "") or "").strip()
    return enabled and bool(api_key), api_key


def _google_safe_browsing_match(normalized_url):
    enabled, api_key = _google_safe_browsing_enabled()
    if not enabled:
        return False, False

    payload = {
        "client": {"clientId": "cyberbase-webguard", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": normalized_url}],
        },
    }

    try:
        response = requests.post(
            f"{SAFE_BROWSING_ENDPOINT}?key={api_key}",
            timeout=_request_timeout_seconds(),
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload),
        )
        response.raise_for_status()
        data = response.json() if response.content else {}
        matches = data.get("matches") or []
        return bool(matches), False
    except Exception:
        return False, True


def evaluate_url_reputation(raw_url):
    normalized_url = normalize_url_or_raise(raw_url)
    parsed = urlsplit(normalized_url)
    hostname = (parsed.hostname or "").lower().strip(".")

    matched_sources = []
    degraded = False

    policy_domains = _domains_from_settings()
    if _hostname_matches(hostname, policy_domains):
        matched_sources.append(MATCHED_SOURCE_POLICY)
        return {
            "decision": "block",
            "verdict": "policy_block",
            "matched_sources": matched_sources,
            "degraded": False,
            "reason": "policy_blacklist_match",
            "normalized_url": normalized_url,
        }

    google_match, google_degraded = _google_safe_browsing_match(normalized_url)
    degraded = degraded or google_degraded
    if google_match:
        matched_sources.append(MATCHED_SOURCE_GOOGLE)

    url_variants = _url_match_variants(normalized_url)
    for source_name in (MATCHED_SOURCE_PHISHTANK, MATCHED_SOURCE_OPENPHISH, MATCHED_SOURCE_URLHAUS):
        snapshot, source_degraded = _ensure_feed_snapshot(source_name)
        degraded = degraded or source_degraded

        urls = snapshot["urls"]
        hosts = snapshot["hosts"]
        if not urls and not hosts:
            continue

        if any(variant in urls for variant in url_variants) or _hostname_matches(hostname, hosts):
            matched_sources.append(source_name)

    if matched_sources:
        verdict = "phishing" if any(
            source in {MATCHED_SOURCE_PHISHTANK, MATCHED_SOURCE_OPENPHISH} for source in matched_sources
        ) else "malicious"
        return {
            "decision": "block",
            "verdict": verdict,
            "matched_sources": sorted(set(matched_sources)),
            "degraded": degraded,
            "reason": "threat_match",
            "normalized_url": normalized_url,
        }

    return {
        "decision": "allow",
        "verdict": "clean" if not degraded else "unknown",
        "matched_sources": [],
        "degraded": degraded,
        "reason": "provider_degraded_allow" if degraded else "no_match",
        "normalized_url": normalized_url,
    }


def reset_reputation_caches_for_tests():
    with _FEED_CACHE_LOCK:
        for key in _FEED_CACHE:
            _FEED_CACHE[key]["urls"] = set()
            _FEED_CACHE[key]["hosts"] = set()
            _FEED_CACHE[key]["fetched_at"] = 0.0
            _FEED_CACHE[key]["last_error"] = ""


def seed_reputation_feed_cache_for_tests(source_name, urls=None, hosts=None):
    if source_name not in _FEED_CACHE:
        raise ValueError("Unknown source name.")

    normalized_urls = set()
    for candidate in urls or []:
        normalized = _normalize_candidate_url(candidate)
        if normalized:
            normalized_urls.add(normalized)

    normalized_hosts = set()
    for host in hosts or []:
        safe_host = str(host or "").strip().lower().strip(".")
        if safe_host:
            normalized_hosts.add(safe_host)

    with _FEED_CACHE_LOCK:
        _FEED_CACHE[source_name]["urls"] = normalized_urls
        _FEED_CACHE[source_name]["hosts"] = normalized_hosts
        _FEED_CACHE[source_name]["fetched_at"] = time.time()
        _FEED_CACHE[source_name]["last_error"] = ""
