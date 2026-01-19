/**
 * Placeholder Icon Creator for StoryCore Creative Studio
 * 
 * This script creates a simple placeholder icon for development builds.
 * For production, replace with a proper icon design.
 */

const fs = require('fs');
const path = require('path');

// Create build directory if it doesn't exist
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Create a simple SVG icon as placeholder
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#1a1a2e"/>
  <circle cx="256" cy="256" r="200" fill="#16213e" stroke="#0f3460" stroke-width="8"/>
  <text x="256" y="280" font-family="Arial, sans-serif" font-size="120" font-weight="bold" 
        fill="#e94560" text-anchor="middle">SC</text>
  <text x="256" y="380" font-family="Arial, sans-serif" font-size="40" 
        fill="#e94560" text-anchor="middle">STUDIO</text>
</svg>`;

// Save SVG
const svgPath = path.join(buildDir, 'icon.svg');
fs.writeFileSync(svgPath, svgIcon);

console.log('✅ Created placeholder SVG icon at:', svgPath);
console.log('\n📝 Next steps:');
console.log('1. Convert icon.svg to icon.png (512x512) using an online tool or image editor');
console.log('2. Convert icon.png to icon.ico using: https://convertio.co/png-ico/');
console.log('3. Place both files in the build/ directory');
console.log('\n⚠️  For now, electron-builder will use the default Electron icon');
console.log('   The application will still work, just without a custom icon.\n');
