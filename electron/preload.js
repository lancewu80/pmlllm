/**
 * Preload script — runs in renderer context with access to Node IPC.
 * Exposes a safe API to the web app via window.electronAPI.
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  /** Current OS platform: 'win32' | 'darwin' | 'linux' */
  platform: process.platform,

  /**
   * Open a native file-picker dialog.
   * Returns { name, path, data (base64) } or null if cancelled.
   */
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),

  /**
   * Open a native save dialog and write base64 data to disk.
   * Returns true on success, false if cancelled.
   */
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),

  /** Open a file or folder in the OS shell. */
  openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
})
