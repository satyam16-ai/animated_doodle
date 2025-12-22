"use strict";

// src/preload/index.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  saveVideo: (buffer) => import_electron.ipcRenderer.invoke("save-video", buffer),
  saveVideoWebM: (buffer) => import_electron.ipcRenderer.invoke("save-video-webm", buffer)
});
