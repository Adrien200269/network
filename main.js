const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1040,
    height: 780,
    minWidth: 850,
    minHeight: 650,
    backgroundColor: '#0a0d14',
    title: 'Network ko speed',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// IPC Handlers for system info and speed test assistance if needed
ipcMain.handle('get-system-info', async () => {
  const interfaces = os.networkInterfaces();
  const netInfo = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (!addr.internal && addr.family === 'IPv4') {
        netInfo.push({
          interface: name,
          ip: addr.address,
          mac: addr.mac,
          netmask: addr.netmask
        });
      }
    }
  }

  return {
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    interfaces: netInfo
  };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
