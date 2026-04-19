const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  pickVideo:      ()       => ipcRenderer.invoke('pick-video'),
  pickOutput:     (name)   => ipcRenderer.invoke('pick-output', name),
  convert:        (opts)   => ipcRenderer.invoke('convert', opts),
  showInFolder:   (path)   => ipcRenderer.invoke('show-in-folder', path),
  windowClose:    ()       => ipcRenderer.invoke('window-close'),
  windowMinimize: ()       => ipcRenderer.invoke('window-minimize'),
  onProgress:     (cb)     => ipcRenderer.on('progress', (_, data) => cb(data)),
});
