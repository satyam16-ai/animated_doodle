import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },
    saveVideo: (buffer: ArrayBuffer) => ipcRenderer.invoke('save-video', buffer),
    saveVideoWebM: (buffer: ArrayBuffer) => ipcRenderer.invoke('save-video-webm', buffer),
})
