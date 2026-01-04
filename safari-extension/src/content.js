(() => {
  const BLOCKED_DOMAINS = new Set(["youtube.com", "x.com", "twitter.com"]);

  const normalizeHostname = (hostname) => {
    const lower = (hostname || "").toLowerCase();
    return lower.startsWith("www.") ? lower.slice(4) : lower;
  };

  const isBlocked = (hostname) => BLOCKED_DOMAINS.has(normalizeHostname(hostname));

  const renderBlocked = (hostname) => {
    const displayHost = normalizeHostname(hostname);
    const html = `
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Blocked</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          html, body { height: 100%; }
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #f5f3ef;
            color: #1b1b1b;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
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
          button {
            appearance: none;
            border: 1px solid #d9d2c8;
            background: #fff7ee;
            color: #1b1b1b;
            padding: 10px 16px;
            border-radius: 999px;
            font-size: 15px;
            font-weight: 600;
          }
          button.secondary {
            background: #ffffff;
          }
        </style>
      </head>
      <body>
        <main class="card" role="main">
          <h1>Blocked</h1>
          <p>This site is blocked by your settings.</p>
          <div class="domain">${displayHost}</div>
          <div class="actions">
            <button type="button">Open app</button>
            <button type="button" class="secondary">Close</button>
          </div>
        </main>
      </body>
    `;

    if (document.documentElement) {
      document.documentElement.innerHTML = html;
    }
  };

  const handleLocationChange = () => {
    if (isBlocked(location.hostname)) {
      renderBlocked(location.hostname);
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

  hookHistory();
  if (document.documentElement) {
    handleLocationChange();
  } else {
    document.addEventListener("DOMContentLoaded", handleLocationChange, { once: true });
  }
})();
