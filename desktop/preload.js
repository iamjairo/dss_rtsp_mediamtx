const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApi", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (config) => ipcRenderer.invoke("config:save", config),
  checkStatus: () => ipcRenderer.invoke("status:check"),
  startStandalone: () => ipcRenderer.invoke("standalone:start"),
  stopStandalone: () => ipcRenderer.invoke("standalone:stop"),
  getLogs: () => ipcRenderer.invoke("logs:get")
});
