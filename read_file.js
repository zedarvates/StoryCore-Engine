const fs = require('fs');
const lines = fs.readFileSync('electron/ipcChannels.ts', 'utf8').split('\n');
console.log(lines.slice(1749, 1800).join('\n'));
