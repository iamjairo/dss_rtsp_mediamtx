const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const net = require("net");
const http = require("http");

let backendProcess = null;
let mediamtxProcess = null;
let go2rtcProcess = null;
const logs = [];
const MAX_LOG_ENTRIES = 400;

const isPackaged = app.isPackaged;
const packagedBackendDir = path.join(process.resourcesPath, "backend");
const devBackendDir = path.resolve(__dirname, "..");
const BACKEND_ENTRYPOINT_FILE = "main.py";

const defaultConfig = {
  mode: "connect",
  backendHost: "127.0.0.1",
  backendPort: 8008,
  backendCommand: "python",
  backendEntry: isPackaged ? path.join(packagedBackendDir, BACKEND_ENTRYPOINT_FILE) : path.join(devBackendDir, BACKEND_ENTRYPOINT_FILE),
  backendCwd: isPackaged ? packagedBackendDir : devBackendDir,
  mediaProvider: "mediamtx",
  mediaHost: "127.0.0.1",
  mediaPort: 8554,
  go2rtcHost: "127.0.0.1",
  go2rtcPort: 1984,
  useLocalMediamtx: false,
  mediamtxExecutable: "",
  mediamtxArgs: "",
  useLocalGo2rtc: false,
  go2rtcExecutable: "",
  go2rtcArgs: "",
  dahuaUsername: "system",
  dahuaPassword: "",
  dahuaBaseUrl: "http://192.168.105.15:8000"
};

function pushLog(source, message) {
  logs.push({
    source,
    message,
    ts: new Date().toISOString()
  });
  if (logs.length > MAX_LOG_ENTRIES) {
    logs.splice(0, logs.length - MAX_LOG_ENTRIES);
  }
}

function configPath() {
  return path.join(app.getPath("userData"), "desktop-config.json");
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(configPath(), "utf-8");
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch (_err) {
    return { ...defaultConfig };
  }
}

function saveConfig(config) {
  const merged = { ...defaultConfig, ...config };
  fs.writeFileSync(configPath(), JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

function splitArgs(rawArgs) {
  if (!rawArgs || !rawArgs.trim()) {
    return [];
  }
  const matches = rawArgs.match(/"[^"]*"|'[^']*'|[^\s]+/g) || [];
  return matches.map((part) => part.replace(/^['"]|['"]$/g, ""));
}

function startManagedProcess(name, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
  pushLog(name, `started: ${command} ${args.join(" ")}`);
  child.stdout.on("data", (buf) => pushLog(name, buf.toString().trim()));
  child.stderr.on("data", (buf) => pushLog(name, buf.toString().trim()));
  child.on("close", (code) => pushLog(name, `exited with code ${code}`));
  return child;
}

function stopManagedProcess(name, child) {
  if (!child) {
    return null;
  }
  if (!child.killed) {
    child.kill();
    pushLog(name, "stop requested");
  }
  return null;
}

function checkHttpStatus(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2500 }, (res) => {
      resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function checkTcpStatus(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 2500 });
    socket.on("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

async function checkServicesStatus(config) {
  const backend = await checkHttpStatus(`http://${config.backendHost}:${config.backendPort}/health`);
  const mediamtx = await checkTcpStatus(config.mediaHost, Number(config.mediaPort));
  const go2rtc = await checkHttpStatus(`http://${config.go2rtcHost}:${config.go2rtcPort}/api`);
  return { backend, mediamtx, go2rtc };
}

async function startStandalone() {
  const config = loadConfig();
  const env = {
    ...process.env,
    PORT: String(config.backendPort),
    APP_HOST: "0.0.0.0",
    MEDIA_PROVIDER: config.mediaProvider,
    MEDIA_HOST: config.mediaHost,
    MEDIA_PORT: String(config.mediaPort),
    DAHUA_USERNAME: config.dahuaUsername,
    DAHUA_PASSWORD: config.dahuaPassword,
    DAHUA_URL_BASE: config.dahuaBaseUrl
  };

  if (!backendProcess) {
    backendProcess = startManagedProcess(
      "backend",
      config.backendCommand,
      [config.backendEntry],
      { cwd: config.backendCwd, env }
    );
  }

  if (config.useLocalMediamtx && config.mediamtxExecutable && !mediamtxProcess) {
    mediamtxProcess = startManagedProcess(
      "mediamtx",
      config.mediamtxExecutable,
      splitArgs(config.mediamtxArgs),
      { cwd: config.backendCwd, env: process.env }
    );
  }

  if (config.useLocalGo2rtc && config.go2rtcExecutable && !go2rtcProcess) {
    go2rtcProcess = startManagedProcess(
      "go2rtc",
      config.go2rtcExecutable,
      splitArgs(config.go2rtcArgs),
      { cwd: config.backendCwd, env: process.env }
    );
  }

  return checkServicesStatus(config);
}

function stopStandalone() {
  backendProcess = stopManagedProcess("backend", backendProcess);
  mediamtxProcess = stopManagedProcess("mediamtx", mediamtxProcess);
  go2rtcProcess = stopManagedProcess("go2rtc", go2rtcProcess);
  return { stopped: true };
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopStandalone();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("config:get", async () => loadConfig());
ipcMain.handle("config:save", async (_evt, newConfig) => saveConfig(newConfig));
ipcMain.handle("status:check", async () => checkServicesStatus(loadConfig()));
ipcMain.handle("standalone:start", async () => startStandalone());
ipcMain.handle("standalone:stop", async () => stopStandalone());
ipcMain.handle("logs:get", async () => logs.slice().reverse());
