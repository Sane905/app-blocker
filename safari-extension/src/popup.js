const extensionApi = globalThis.browser ?? globalThis.chrome;
const STORAGE_KEY = "blocklist";

const domainEl = document.getElementById("domain");
const messageEl = document.getElementById("message");
const addButton = document.getElementById("add-btn");
const removeButton = document.getElementById("remove-btn");

const normalizeHostname = (hostname) => {
  const lower = (hostname || "").toLowerCase();
  return lower.startsWith("www.") ? lower.slice(4) : lower;
};

const setMessage = (text, isError = false) => {
  messageEl.textContent = text;
  messageEl.classList.toggle("error", isError);
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

const storageSet = (items) =>
  new Promise((resolve) => {
    if (!extensionApi?.storage?.local?.set) {
      resolve(false);
      return;
    }
    let settled = false;
    const finish = (ok) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(ok);
    };
    const maybePromise = extensionApi.storage.local.set(items, () => {
      if (extensionApi?.runtime?.lastError) {
        finish(false);
        return;
      }
      finish(true);
    });
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then(() => finish(true)).catch(() => finish(false));
    }
  });

const tabsQuery = (queryInfo) =>
  new Promise((resolve) => {
    if (!extensionApi?.tabs?.query) {
      resolve([]);
      return;
    }
    let settled = false;
    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result || []);
    };
    const maybePromise = extensionApi.tabs.query(queryInfo, (tabs) => {
      if (extensionApi?.runtime?.lastError) {
        finish([]);
        return;
      }
      finish(tabs);
    });
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.then(finish).catch(() => finish([]));
    }
  });

const getBlocklist = async () => {
  const data = await storageGet([STORAGE_KEY]);
  const list = Array.isArray(data?.[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  return list.map(normalizeHostname).filter(Boolean);
};

const setBlocklist = async (list) => {
  const normalized = list.map(normalizeHostname).filter(Boolean);
  const unique = Array.from(new Set(normalized));
  const ok = await storageSet({ [STORAGE_KEY]: unique });
  return ok ? unique : null;
};

const getCurrentHost = async () => {
  const tabs = await tabsQuery({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.url) {
    return { error: "タブのURLを取得できません。" };
  }
  let url;
  try {
    url = new URL(tab.url);
  } catch {
    return { error: "このページでは使用できません。" };
  }
  if (!url.hostname) {
    return { error: "このページでは使用できません。" };
  }
  return { host: normalizeHostname(url.hostname) };
};

let currentHost = null;

const updateButtons = (isBlocked) => {
  addButton.disabled = isBlocked;
  removeButton.disabled = !isBlocked;
};

const loadState = async () => {
  setMessage("");
  domainEl.textContent = "読み込み中...";
  addButton.disabled = true;
  removeButton.disabled = true;

  const result = await getCurrentHost();
  if (result.error) {
    currentHost = null;
    domainEl.textContent = "-";
    setMessage(result.error, true);
    return;
  }

  currentHost = result.host;
  domainEl.textContent = currentHost;

  const list = await getBlocklist();
  const isBlocked = list.includes(currentHost);
  updateButtons(isBlocked);
};

addButton.addEventListener("click", async () => {
  if (!currentHost) {
    return;
  }
  const list = await getBlocklist();
  if (!list.includes(currentHost)) {
    list.push(currentHost);
  }
  const updated = await setBlocklist(list);
  if (updated) {
    updateButtons(true);
    setMessage("追加しました。");
  } else {
    setMessage("保存に失敗しました。", true);
  }
});

removeButton.addEventListener("click", async () => {
  if (!currentHost) {
    return;
  }
  const list = await getBlocklist();
  const updated = await setBlocklist(list.filter((item) => item !== currentHost));
  if (updated) {
    updateButtons(false);
    setMessage("解除しました。");
  } else {
    setMessage("保存に失敗しました。", true);
  }
});

loadState().catch(() => {
  setMessage("初期化に失敗しました。", true);
  addButton.disabled = true;
  removeButton.disabled = true;
});
