const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 680,
    minWidth: 700,
    minHeight: 580,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'hidden',
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── IPC: Pick input video ─────────────────────────────────────────────────────
ipcMain.handle('pick-video', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Video File',
    filters: [{ name: 'Videos', extensions: ['mp4','mov','avi','mkv','webm','flv','wmv','m4v'] }],
    properties: ['openFile'],
  });
  return canceled ? null : filePaths[0];
});

// ── IPC: Pick output path ─────────────────────────────────────────────────────
ipcMain.handle('pick-output', async (_, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save GIF As',
    defaultPath: defaultName,
    filters: [{ name: 'GIF', extensions: ['gif'] }],
  });
  return canceled ? null : filePath;
});

// ── IPC: Convert ──────────────────────────────────────────────────────────────
ipcMain.handle('convert', async (event, opts) => {
  const { input, output, fps, width, quality, start, duration, loop } = opts;

  // quality → palette settings
  const qualityMap = {
    low:    { colors: 64,  dither: 'bayer:bayer_scale=5' },
    medium: { colors: 128, dither: 'bayer:bayer_scale=3' },
    high:   { colors: 256, dither: 'floyd_steinberg'      },
  };
  const { colors, dither } = qualityMap[quality] || qualityMap.medium;
  const palette = path.join(os.tmpdir(), `palette_${Date.now()}.png`);
  const scale   = `scale=${width}:-1:flags=lanczos`;

  // Check ffmpeg
  const ffmpegPath = await findFFmpeg();
  if (!ffmpegPath) {
    return { success: false, error: 'FFmpeg not found. Please install FFmpeg and ensure it is in your PATH.' };
  }

  // Build time flags
  const timeFlags = [];
  if (start)    timeFlags.push('-ss', String(start));
  if (duration) timeFlags.push('-t',  String(duration));

  // Step 1: palette
  try {
    await runFFmpeg(ffmpegPath, [
      '-v', 'warning',
      ...timeFlags,
      '-i', input,
      '-vf', `${scale},palettegen=max_colors=${colors}:stats_mode=diff`,
      '-y', palette,
    ], (prog) => event.sender.send('progress', { phase: 'palette', value: prog }));
  } catch (e) {
    return { success: false, error: `Palette generation failed: ${e.message}` };
  }

  // Step 2: render gif
  try {
    await runFFmpeg(ffmpegPath, [
      '-v', 'warning',
      ...timeFlags,
      '-i', input,
      '-i', palette,
      '-lavfi', `${scale} [x]; [x][1:v] paletteuse=dither=${dither}`,
      '-r', String(fps),
      '-loop', String(loop),
      '-y', output,
    ], (prog) => event.sender.send('progress', { phase: 'render', value: prog }));
  } catch (e) {
    fs.existsSync(palette) && fs.unlinkSync(palette);
    return { success: false, error: `GIF render failed: ${e.message}` };
  }

  fs.existsSync(palette) && fs.unlinkSync(palette);
  const stat = fs.statSync(output);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
  return { success: true, output, sizeMB };
});

ipcMain.handle('show-in-folder', async (_, filePath) => shell.showItemInFolder(filePath));
ipcMain.handle('window-close',   () => mainWindow.close());
ipcMain.handle('window-minimize',() => mainWindow.minimize());

// ── Helpers ───────────────────────────────────────────────────────────────────
function findFFmpeg() {
  return new Promise((resolve) => {
    const candidates = ['ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg', '/usr/bin/ffmpeg'];
    let found = null;
    for (const c of candidates) {
      try {
        const p = spawn(c, ['-version'], { stdio: 'ignore' });
        p.on('close', (code) => { if (code === 0 && !found) { found = c; resolve(c); } });
        p.on('error', () => {});
      } catch (_) {}
    }
    setTimeout(() => { if (!found) resolve(null); }, 3000);
  });
}

function runFFmpeg(bin, args, onProgress) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let errBuf = '';
    proc.stderr.on('data', (d) => { errBuf += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(errBuf.slice(-400)));
    });
    proc.on('error', reject);
  });
}
