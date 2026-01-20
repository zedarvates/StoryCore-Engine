console.log('process.versions.electron:', process.versions.electron);

try {
  const electron = require('electron');
  console.log('electron require:', typeof electron);
  if (typeof electron === 'object') {
    console.log('electron.app:', typeof electron.app);
    console.log('electron.BrowserWindow:', typeof electron.BrowserWindow);
  } else {
    console.log('electron value:', electron);
  }
} catch (e) {
  console.log('electron require error:', e.message);
}