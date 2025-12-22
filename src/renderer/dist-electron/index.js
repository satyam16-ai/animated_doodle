"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Add API methods here
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  saveVideo: (buffer) => electron.ipcRenderer.invoke("save-video", buffer)
});
