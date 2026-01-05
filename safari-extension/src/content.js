(() => {
  const BLOCKED_ROOT_ID = "app-blocker-root";
  const BLOCKED_ATTR = "data-app-blocker";
  const STORAGE_KEY = "blocklist";
  const extensionApi = globalThis.browser ?? globalThis.chrome;
  let currentBlockedHost = null;
  let isApplying = false;
  let observer = null;
  let cachedBlocklist = [];
  let hasCache = false;
  let isLoadingBlocklist = false;

  const normalizeHostname = (hostname) => {
    const lower = (hostname || "").toLowerCase();
    return lower.startsWith("www.") ? lower.slice(4) : lower;
  };

  const storageGet = (key) =>
    new Promise((resolve) => {
      if (!extensionApi?.storage?.local?.get) {
        resolve({});
        return;
      }
      let settled = false;
      const finish = (result) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(result || {});
      };
      const maybePromise = extensionApi.storage.local.get(key, (result) => {
        if (extensionApi?.runtime?.lastError) {
          finish({});
          return;
        }
        finish(result);
      });
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(finish).catch(() => finish({}));
      }
    });

  const refreshBlocklist = async () => {
    if (isLoadingBlocklist) {
      return cachedBlocklist;
    }
    isLoadingBlocklist = true;
    try {
      const data = await storageGet([STORAGE_KEY]);
      const list = Array.isArray(data?.[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
      cachedBlocklist = list.map(normalizeHostname).filter(Boolean);
      hasCache = true;
      return cachedBlocklist;
    } catch {
      return [];
    } finally {
      isLoadingBlocklist = false;
    }
  };

  const getBlocklist = async () => {
    if (hasCache) {
      return cachedBlocklist;
    }
    return refreshBlocklist();
  };

  const isBlocked = async (hostname) => {
    const normalized = normalizeHostname(hostname);
    if (!normalized) {
      return false;
    }
    const blocklist = await getBlocklist();
    return blocklist.includes(normalized);
  };

  const renderBlocked = (hostname) => {
    if (isApplying) {
      return;
    }
    isApplying = true;
    currentBlockedHost = hostname;

    if (typeof window.stop === "function") {
      try {
        window.stop();
      } catch {
        // Ignore failures; we still replace DOM.
      }
    }

    const displayHost = normalizeHostname(hostname);
    const originalUrl = location.href;
    const openAppUrl = `onesecmvp://unlock?host=${encodeURIComponent(
      displayHost
    )}&url=${encodeURIComponent(originalUrl)}`;
    const html = `
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Blocked</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #f5f3ef;
            color: #1b1b1b;
          }
          #${BLOCKED_ROOT_ID} {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #f5f3ef;
            overflow: hidden;
          }
          .card {
            width: min(560px, 92vw);
            background: #ffffff;
            border: 1px solid #e6e1d9;
            border-radius: 16px;
            padding: 28px;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
          }
          h1 {
            margin: 0 0 12px;
            font-size: 28px;
          }
          p {
            margin: 0 0 16px;
            line-height: 1.5;
          }
          .domain {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 24px;
          }
          .actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }
          .action {
            appearance: none;
            border: 1px solid #d9d2c8;
            background: #fff7ee;
            color: #1b1b1b;
            padding: 10px 16px;
            border-radius: 999px;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .action.secondary {
            background: #ffffff;
          }
        </style>
      </head>
      <body>
        <div id="${BLOCKED_ROOT_ID}">
          <main class="card" role="main">
            <h1>Blocked</h1>
            <p>This site is blocked by your settings.</p>
            <div class="domain">${displayHost}</div>
            <div class="actions">
              <a class="action" href="${openAppUrl}">Open app</a>
              <button type="button" class="action secondary">Close</button>
            </div>
          </main>
        </div>
      </body>
    `;

    if (document.documentElement) {
      document.documentElement.setAttribute(BLOCKED_ATTR, "true");
      document.documentElement.innerHTML = html;
    }
    isApplying = false;
  };

  const handleLocationChange = async () => {
    const hostname = location.hostname;
    if (!hostname) {
      return;
    }
    const blocked = await isBlocked(hostname);
    if (hostname !== location.hostname) {
      return;
    }
    if (blocked) {
      renderBlocked(hostname);
    }
  };

  const hookHistory = () => {
    const originalPushState = history.pushState;
    history.pushState = function pushStatePatched(...args) {
      const result = originalPushState.apply(this, args);
      handleLocationChange();
      return result;
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function replaceStatePatched(...args) {
      const result = originalReplaceState.apply(this, args);
      handleLocationChange();
      return result;
    };

    window.addEventListener("popstate", handleLocationChange);
  };

  const ensureObserver = () => {
    if (observer || !document.documentElement) {
      return;
    }
    observer = new MutationObserver(() => {
      if (!currentBlockedHost || isApplying) {
        return;
      }
      const root = document.getElementById(BLOCKED_ROOT_ID);
      if (!root) {
        renderBlocked(currentBlockedHost);
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  };

  hookHistory();
  ensureObserver();
  if (extensionApi?.storage?.onChanged?.addListener) {
    extensionApi.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes?.[STORAGE_KEY]) {
        return;
      }
      const next = changes[STORAGE_KEY].newValue;
      cachedBlocklist = Array.isArray(next)
        ? next.map(normalizeHostname).filter(Boolean)
        : [];
      hasCache = true;
    });
  }
  if (document.documentElement) {
    handleLocationChange();
  } else {
    document.addEventListener("DOMContentLoaded", handleLocationChange, {
      once: true,
    });
  }
})();
