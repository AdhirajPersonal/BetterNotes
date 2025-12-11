import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'

const { PdfReader } = require('pdfreader');
const mammoth = require('mammoth');

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#000000',
      symbolColor: '#ffffff',
      height: 40
    },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const store = new Store();

  ipcMain.handle('electron-store-get', async (_event, key) => {
    return store.get(key);
  });

  ipcMain.on('electron-store-set', async (_event, key, val) => {
    store.set(key, val);
  });

  ipcMain.handle('parse-file', async (_event, { name, buffer }) => {
    try {
      const ext = name.split('.').pop().toLowerCase();
      const fileBuffer = Buffer.from(buffer);
      
      if (ext === 'pdf') {
        const text = await new Promise<string>((resolve, reject) => {
            let content = '';
            let lastY = -1; 
            
            new PdfReader().parseBuffer(fileBuffer, (err, item) => {
                if (err) {
                    reject(err);
                } else if (!item) {
                    resolve(content);
                } else if (item.text) {
                    if (lastY !== -1 && Math.abs(item.y - lastY) > 1) {
                        content += '\n';
                    }
                    content += item.text + ' ';
                    lastY = item.y;
                }
            });
        });
        return { success: true, text: text };
      }
      
      if (ext === 'docx') {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        return { success: true, text: result.value };
      }

      return { success: true, text: fileBuffer.toString('utf-8') };

    } catch (error) {
      console.error("File Parse Error:", error);
      return { success: false, error: String(error) };
    }
  });

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})