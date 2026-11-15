global.File = class File { };

const { app, BrowserWindow, ipcMain, screen, globalShortcut } = require('electron');
const path = require('path');
const ytSearch = require('yt-search');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const PlaylistImporter = require('./src/js/playlistImporter');

const isWin = process.platform === 'win32';
const YT_DLP_NAME = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const USER_DATA_PATH = app.getPath('userData');
const YT_DLP_TARGET_PATH = path.join(USER_DATA_PATH, YT_DLP_NAME);

const streamCache = {};
const CACHE_EXPIRY = 3600000;
const MAX_CACHE_SIZE = 20;

function addToCache(videoUrl, streamUrl) {
  const keys = Object.keys(streamCache);
  if (keys.length >= MAX_CACHE_SIZE) {
    let oldestKey = keys[0];
    let oldestTime = streamCache[oldestKey].time;
    for (let i = 1; i < keys.length; i++) {
      if (streamCache[keys[i]].time < oldestTime) {
        oldestTime = streamCache[keys[i]].time;
        oldestKey = keys[i];
      }
    }
    delete streamCache[oldestKey];
  }
  streamCache[videoUrl] = { url: streamUrl, time: Date.now() };
}

function getExecutablePath() {
  if (fs.existsSync(YT_DLP_TARGET_PATH)) return YT_DLP_TARGET_PATH;
  const packagedPath = path.join(process.resourcesPath, YT_DLP_NAME);
  if (app.isPackaged && fs.existsSync(packagedPath)) return packagedPath;
  const localPath = path.join(__dirname, YT_DLP_NAME);
  if (fs.existsSync(localPath)) return localPath;
  return 'yt-dlp';
}

function createWindow() {
  const win = new BrowserWindow({
    width: 340,
    height: 575,
    minWidth: 290,
    minHeight: 340,
    frame: false,
    transparent: true,
    resizable: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  win.loadFile('index.html');

  ipcMain.on('minimize-app', () => {
    win.minimize();
  });

  ipcMain.on('resize-window', (event, width, height, centerOnCurrent = false) => {
    win.setResizable(true);
    const targetW = Math.max(290, width);
    const targetH = Math.max(340, height);
    const [currentX, currentY] = win.getPosition();
    const [currentW, currentH] = win.getSize();

    let newX = currentX;
    let newY = currentY;

    if (centerOnCurrent) {
      newX = Math.round(currentX - (targetW - currentW) / 2);
      newY = Math.round(currentY - (targetH - currentH) / 2);
    }

    const display = screen.getDisplayNearestPoint({ x: currentX, y: currentY });
    if (display && display.workArea) {
      const { x: minX, y: minY, width: dispW, height: dispH } = display.workArea;
      if (newX + targetW > minX + dispW) {
        newX = minX + dispW - targetW;
      }
      if (newY + targetH > minY + dispH) {
        newY = minY + dispH - targetH;
      }
      if (newX < minX) {
        newX = minX;
      }
      if (newY < minY) {
        newY = minY;
      }
    }

    win.setBounds({ x: newX, y: newY, width: targetW, height: targetH });
    win.setResizable(false);
  });

  ipcMain.on('set-always-on-top', (event, flag) => {
    win.setAlwaysOnTop(flag, 'screen-saver');
  });

  ipcMain.on('get-user-data-path', (event) => {
    event.returnValue = USER_DATA_PATH;
  });

  globalShortcut.register('Alt+Right', () => {
    if (!win.isDestroyed()) win.webContents.send('global-shortcut-next');
  });

  globalShortcut.register('Alt+Left', () => {
    if (!win.isDestroyed()) win.webContents.send('global-shortcut-prev');
  });

  globalShortcut.register('Alt+P', () => {
    if (!win.isDestroyed()) win.webContents.send('global-shortcut-play-pause');
  });

  const volUpKeys = ['Alt+=', 'Alt+Plus', 'Alt+numadd'];
  volUpKeys.forEach(key => {
    try {
      globalShortcut.register(key, () => {
        if (!win.isDestroyed()) win.webContents.send('global-shortcut-vol-up');
      });
    } catch (e) { }
  });

  const volDownKeys = ['Alt+-', 'Alt+numsub'];
  volDownKeys.forEach(key => {
    try {
      globalShortcut.register(key, () => {
        if (!win.isDestroyed()) win.webContents.send('global-shortcut-vol-down');
      });
    } catch (e) { }
  });
}

function extractLocalCover(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    const fd = fs.openSync(filePath, 'r');
    const readLength = Math.min(1024 * 1024 * 4, stat.size);
    const buf = Buffer.alloc(readLength);
    fs.readSync(fd, buf, 0, readLength, 0);
    fs.closeSync(fd);

    const apicIdx = buf.indexOf('APIC');
    if (apicIdx !== -1 && apicIdx + 10 < buf.length) {
      let frameSize = buf.readUInt32BE(apicIdx + 4);
      if (frameSize > 0 && frameSize < 1024 * 1024 * 10) {
        const frameData = buf.slice(apicIdx + 10, Math.min(buf.length, apicIdx + 10 + frameSize));
        const jpgIdx = frameData.indexOf(Buffer.from([0xFF, 0xD8, 0xFF]));
        const pngIdx = frameData.indexOf(Buffer.from([0x89, 0x50, 0x4E, 0x47]));
        let imgStart = -1;
        let mime = 'image/jpeg';
        if (jpgIdx !== -1 && (pngIdx === -1 || jpgIdx < pngIdx)) {
          imgStart = jpgIdx;
          mime = 'image/jpeg';
        } else if (pngIdx !== -1) {
          imgStart = pngIdx;
          mime = 'image/png';
        }
        if (imgStart !== -1) {
          const imgBuffer = frameData.slice(imgStart);
          return `data:${mime};base64,${imgBuffer.toString('base64')}`;
        }
      }
    }

    const covrIdx = buf.indexOf('covr');
    if (covrIdx !== -1 && covrIdx + 24 < buf.length) {
      const dataIdx = buf.indexOf('data', covrIdx);
      if (dataIdx !== -1 && dataIdx + 16 < buf.length) {
        const atomSize = buf.readUInt32BE(dataIdx - 4);
        if (atomSize > 16 && atomSize < 1024 * 1024 * 10) {
          const imgBuffer = buf.slice(dataIdx + 12, Math.min(buf.length, dataIdx - 4 + atomSize));
          let mime = 'image/jpeg';
          if (imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50) mime = 'image/png';
          return `data:${mime};base64,${imgBuffer.toString('base64')}`;
        }
      }
    }
  } catch (e) { }
  return null;
}

ipcMain.handle('get-local-cover', async (event, filePath) => {
  return extractLocalCover(filePath);
});

ipcMain.handle('yt-search-list', async (event, query) => {
  try {
    const r = await ytSearch(query);
    return r.videos.slice(0, 15).map(v => ({
      title: v.title,
      timestamp: v.timestamp,
      videoId: v.videoId,
      thumbnail: v.thumbnail,
      url: v.url
    }));
  } catch (e) {
    return [];
  }
});

ipcMain.handle('yt-get-stream', async (event, videoUrl, forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && streamCache[videoUrl] && now - streamCache[videoUrl].time < CACHE_EXPIRY) {
    return { success: true, url: streamCache[videoUrl].url };
  }
  if (forceRefresh) {
    delete streamCache[videoUrl];
  }

  const ytDlpExecutable = getExecutablePath();
  const command = `"${ytDlpExecutable}" -f bestaudio -g "${videoUrl}"`;

  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: "Dönüştürme hatası!" });
        return;
      }
      const lines = stdout.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const streamUrl = lines.reverse().find(l => l.startsWith('http'));
      if (streamUrl) {
        addToCache(videoUrl, streamUrl);
        resolve({ success: true, url: streamUrl });
      } else {
        resolve({ success: false, error: "Link bulunamadı." });
      }
    });
  });
});

const importer = new PlaylistImporter(getExecutablePath);

let activeYtStreamChild = null;

ipcMain.handle('import-youtube-stream-start', (event, url) => {
  if (activeYtStreamChild) {
    try { activeYtStreamChild.kill(); } catch (e) { }
    activeYtStreamChild = null;
  }
  activeYtStreamChild = importer.streamYouTubeTracks(
    url,
    (track) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('import-youtube-track', track);
      }
    },
    (code) => {
      activeYtStreamChild = null;
      if (!event.sender.isDestroyed()) {
        event.sender.send('import-youtube-done', { code });
      }
    },
    (err) => {
      activeYtStreamChild = null;
      if (!event.sender.isDestroyed()) {
        event.sender.send('import-youtube-error', { message: err.message });
      }
    }
  );
  return { started: true };
});

ipcMain.handle('import-youtube-cancel', () => {
  if (activeYtStreamChild) {
    try { activeYtStreamChild.kill(); } catch (e) { }
    activeYtStreamChild = null;
  }
  return { cancelled: true };
});

ipcMain.handle('import-detect-platform', async (event, url) => {
  return importer.detectPlatform(url);
});

ipcMain.handle('import-spotify-tracks', async (event, url) => {
  try {
    const result = await importer.extractSpotifyTracks(url);
    if (Array.isArray(result)) {
      return { success: true, tracks: result, title: 'Spotify' };
    }
    return { success: true, tracks: result.tracks || [], title: result.title || 'Spotify' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('import-youtube-tracks', async (event, url) => {
  try {
    const tracks = await importer.extractYouTubeTracks(url);
    return { success: true, tracks };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('import-match-spotify', async (event, spotifyTrack) => {
  try {
    const matched = await importer.matchSpotifyTrackToYouTube(spotifyTrack, async (q) => {
      const r = await ytSearch(q);
      return r.videos.slice(0, 10).map(v => ({
        title: v.title,
        timestamp: v.timestamp,
        videoId: v.videoId,
        thumbnail: v.thumbnail,
        url: v.url
      }));
    });
    return { success: !!matched, track: matched };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  try {
    const sourcePath = app.isPackaged
      ? path.join(process.resourcesPath, YT_DLP_NAME)
      : path.join(__dirname, YT_DLP_NAME);

    if (!fs.existsSync(YT_DLP_TARGET_PATH)) {
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, YT_DLP_TARGET_PATH);
      }
    }

    const execPath = fs.existsSync(YT_DLP_TARGET_PATH) ? YT_DLP_TARGET_PATH : (fs.existsSync(sourcePath) ? sourcePath : null);
    if (execPath) {
      const updateCheckFile = path.join(USER_DATA_PATH, 'last_update_check.json');
      let shouldCheck = true;
      try {
        if (fs.existsSync(updateCheckFile)) {
          const data = JSON.parse(fs.readFileSync(updateCheckFile, 'utf8'));
          if (Date.now() - data.lastCheck < 86400000) {
            shouldCheck = false;
          }
        }
      } catch (e) { }

      if (shouldCheck) {
        setTimeout(() => {
          try {
            fs.writeFileSync(updateCheckFile, JSON.stringify({ lastCheck: Date.now() }));
            const updateProcess = spawn(execPath, ['-U'], {
              detached: true,
              stdio: 'ignore',
              windowsHide: true
            });
            updateProcess.unref();
          } catch (e) { }
        }, 20000);
      }
    }

  } catch (err) {
  }

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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});