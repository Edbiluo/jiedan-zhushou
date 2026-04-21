const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showUnreportedToday: () => ipcRenderer.invoke('app:showUnreportedToday'),
  pickImage: () => ipcRenderer.invoke('file:pickImage'),
  pickImages: () => ipcRenderer.invoke('file:pickImages'),
  exportBackup: () => ipcRenderer.invoke('file:exportBackup'),
  importBackup: () => ipcRenderer.invoke('file:importBackup'),
  apiBase: 'http://localhost:3899',

  // 用 File 对象取本地路径（拖拽场景用，Electron 32+ 推荐 webUtils）
  getFilePath: (file) => {
    try {
      return webUtils ? webUtils.getPathForFile(file) : (file && file.path) || '';
    } catch {
      return (file && file.path) || '';
    }
  },

  // 自动更新
  getVersion: () => ipcRenderer.invoke('app:version'),
  checkUpdateNow: () => ipcRenderer.invoke('updater:checkNow'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
  onUpdaterState: (cb) => {
    const listener = (_e, state) => cb(state);
    ipcRenderer.on('updater:state', listener);
    return () => ipcRenderer.removeListener('updater:state', listener);
  },
});
