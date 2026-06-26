const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged

// ---------- serve static dist ----------
const serve = require('electron-serve')
const loadURL = serve({
  directory: path.join(__dirname, '../dist'),
})

// ---------- window ----------
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '../assets/adaptive-icon.png'),
    title: 'PM-LLM',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  if (isDev) {
    // dev mode: expo web server must be running on port 8081
    win.loadURL('http://localhost:8081')
    win.webContents.openDevTools()
  } else {
    loadURL(win)
  }

  // open external links in default browser instead of new Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ---------- IPC: file open/save (for Excel import/export) ----------
ipcMain.handle('dialog:openFile', async (_, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: options?.filters ?? [
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (canceled || filePaths.length === 0) return null
  const filePath = filePaths[0]
  const buffer = fs.readFileSync(filePath)
  return {
    name: path.basename(filePath),
    path: filePath,
    data: buffer.toString('base64'),
  }
})

ipcMain.handle('dialog:saveFile', async (_, { defaultName, data, filters }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName ?? 'export.xlsx',
    filters: filters ?? [
      { name: 'Excel Files', extensions: ['xlsx'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (canceled || !filePath) return false
  const buffer = Buffer.from(data, 'base64')
  fs.writeFileSync(filePath, buffer)
  return true
})

ipcMain.handle('shell:openPath', async (_, filePath) => {
  await shell.openPath(filePath)
})

// ---------- app lifecycle ----------
app.whenReady().then(() => {
  Menu.setApplicationMenu(null) // remove default menu; add custom if needed
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
