function setStatus(text) {
  const statusEl = document.getElementById("statusText");
  if (statusEl) statusEl.textContent = text;
}

function setTarget(url) {
  const targetEl = document.getElementById("targetUrl");
  if (targetEl) targetEl.textContent = url || "Invalid URL";
}

function sanitizeTarget(raw) {
  try {
    const parsed = new URL(String(raw || ""));
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return "";
    parsed.hash = "";
    if ((protocol === "http:" && parsed.port === "80") || (protocol === "https:" && parsed.port === "443")) {
      parsed.port = "";
    }
    return parsed.toString();
  } catch (_) {
    return "";
  }
}

async function fallbackContinue(targetUrl, tabId = -1) {
  if (!targetUrl) return;
  try {
    await chrome.runtime.sendMessage({
      action: "REPUTATION_PREPARE_ALLOW",
      target_url: targetUrl,
      tab_id: tabId,
    });
  } catch (_) {}
  setStatus("Reputation service unavailable. Continuing with caution...");
  window.location.replace(targetUrl);
}

async function main() {
  const params = new URLSearchParams(window.location.search);
  const targetRaw = params.get("target") || "";
  const tabIdRaw = params.get("tab_id");
  const tabId = Number.isInteger(Number(tabIdRaw)) ? Number(tabIdRaw) : -1;
  const targetUrl = sanitizeTarget(targetRaw);
  setTarget(targetUrl || targetRaw);

  if (!targetUrl) {
    setStatus("Invalid destination URL.");
    return;
  }

  try {
    const verdict = await chrome.runtime.sendMessage({
      action: "REPUTATION_CHECK_URL",
      target_url: targetUrl,
      tab_id: tabId,
    });

    if (verdict?.decision === "block") {
      setStatus("Threat detected. Blocking destination...");
      const blockedUrl =
        verdict.blocked_page ||
        chrome.runtime.getURL(`blocked.html?target=${encodeURIComponent(targetUrl)}`);
      window.location.replace(blockedUrl);
      return;
    }

    await chrome.runtime.sendMessage({
      action: "REPUTATION_PREPARE_ALLOW",
      target_url: targetUrl,
      tab_id: tabId,
    });

    if (verdict?.degraded) {
      setStatus("Threat feeds partially unavailable. Continuing with caution...");
    } else {
      setStatus("No threats found. Continuing...");
    }
    window.location.replace(targetUrl);
  } catch (_) {
    fallbackContinue(targetUrl, tabId);
  }
}

main();
