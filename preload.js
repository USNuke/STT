const { contextBridge, clipboard } = require('electron');

contextBridge.exposeInMainWorld('sttApi', {
  copyText: (text) => clipboard.writeText(text)
});
