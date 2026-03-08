const fs = require('fs');
const content = fs.readFileSync('electron/ipcChannels.ts', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(1749, 1800).join('\n'));
