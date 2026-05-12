const fields = [
  "mode",
  "backendHost",
  "backendPort",
  "backendCommand",
  "backendEntry",
  "backendCwd",
  "mediaProvider",
  "mediaHost",
  "mediaPort",
  "go2rtcHost",
  "go2rtcPort",
  "useLocalMediamtx",
  "mediamtxExecutable",
  "mediamtxArgs",
  "useLocalGo2rtc",
  "go2rtcExecutable",
  "go2rtcArgs",
  "dahuaUsername",
  "dahuaPassword",
  "dahuaBaseUrl"
];

function element(id) {
  return document.getElementById(id);
}

function readForm() {
  const data = {};
  for (const field of fields) {
    const input = element(field);
    if (!input) continue;
    if (input.type === "checkbox") {
      data[field] = input.checked;
    } else if (input.type === "number") {
      data[field] = Number(input.value);
    } else {
      data[field] = input.value;
    }
  }
  return data;
}

function fillForm(config) {
  for (const field of fields) {
    const input = element(field);
    if (!input) continue;
    if (input.type === "checkbox") {
      input.checked = !!config[field];
    } else {
      input.value = config[field] ?? "";
    }
  }
}

function renderStatus(status) {
  element("status").textContent = JSON.stringify(status, null, 2);
}

async function refreshLogs() {
  const logs = await window.desktopApi.getLogs();
  element("logs").textContent = logs
    .slice(0, 80)
    .map((entry) => `[${entry.ts}] [${entry.source}] ${entry.message}`)
    .join("\n");
}

async function boot() {
  const config = await window.desktopApi.getConfig();
  fillForm(config);

  element("saveBtn").addEventListener("click", async () => {
    await window.desktopApi.saveConfig(readForm());
  });

  element("checkBtn").addEventListener("click", async () => {
    const status = await window.desktopApi.checkStatus();
    renderStatus(status);
    await refreshLogs();
  });

  element("startBtn").addEventListener("click", async () => {
    const cfg = await window.desktopApi.saveConfig(readForm());
    fillForm(cfg);
    const status = await window.desktopApi.startStandalone();
    renderStatus(status);
    await refreshLogs();
  });

  element("stopBtn").addEventListener("click", async () => {
    await window.desktopApi.stopStandalone();
    await refreshLogs();
  });

  setInterval(refreshLogs, 4000);
}

boot();
