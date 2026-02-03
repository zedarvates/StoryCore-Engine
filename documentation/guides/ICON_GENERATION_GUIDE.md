# Icon Generation Guide

## Overview

StoryCore-Engine uses a unified icon system based on `StorycoreIconeV2.png`. This guide covers how to generate and manage application icons for all platforms.

## Quick Start

### Generate All Icons

```bash
npm run icons:generate
```

This single command generates all required icon formats:
- Windows: `build/icon.ico`
- macOS: `build/icon.icns`
- Multiple PNG resolutions in `build/icons/`

## Icon Files

### Source Icon
- **Location**: `StorycoreIconeV2.png` (project root)
- **Format**: PNG with transparency
- **Recommended Size**: 1024x1024 pixels minimum
- **Color Depth**: 32-bit RGBA

### Generated Icons

#### Windows (.ico)
- **Location**: `build/icon.ico`
- **Resolutions**: 16x16, 32x32, 48x48, 256x256
- **Usage**: 
  - Application window icon
  - Taskbar icon
  - NSIS installer icon
  - Desktop shortcuts
  - Start Menu shortcuts

#### macOS (.icns)
- **Location**: `build/icon.icns`
- **Resolutions**: 16x16 through 1024x1024 (including @2x variants)
- **Usage**:
  - Application bundle icon
  - Dock icon
  - Finder icon

#### Individual PNGs
- **Location**: `build/icons/`
- **Files**: 
  - `16x16.png`, `24x24.png`, `32x32.png`, `48x48.png`
  - `64x64.png`, `128x128.png`, `256x256.png`
  - `512x512.png`, `1024x1024.png`
- **Usage**: Web interface, custom implementations

## When to Regenerate Icons

Regenerate icons when:
1. The source icon (`StorycoreIconeV2.png`) is updated
2. Icon files are missing or corrupted
3. After cloning the repository (if icons aren't committed)
4. Before creating a production build

## Integration Points

### Electron Main Process
**File**: `electron/main.ts`

The icon is loaded when creating the BrowserWindow:
```typescript
icon: path.join(__dirname, '../../StorycoreIconeV2.png')
```

### Electron Builder Configuration
**File**: `config/electron-builder.json`

Platform-specific icons are referenced:
```json
{
  "win": {
    "icon": "build/icon.ico"
  },
  "mac": {
    "icon": "build/icon.icns"
  }
}
```

### Web Interface
**File**: `creative-studio-ui/index.html`

Favicon is served from the public directory:
```html
<link rel="icon" type="image/png" href="/storycore-icon.png" />
```

## Troubleshooting

### Icons Not Updating

**Problem**: Icons don't change after regeneration

**Solutions**:
1. Clear Electron cache:
   - Windows: Delete `%APPDATA%/storycore-engine`
   - macOS: Delete `~/Library/Application Support/storycore-engine`
   - Linux: Delete `~/.config/storycore-engine`

2. Rebuild the application:
   ```bash
   npm run build
   ```

3. For packaged apps, reinstall the application

### Icon Generation Fails

**Problem**: `npm run icons:generate` fails

**Solutions**:
1. Verify source icon exists:
   ```bash
   # Windows PowerShell
   Test-Path StorycoreIconeV2.png
   
   # macOS/Linux
   ls -la StorycoreIconeV2.png
   ```

2. Check electron-icon-builder installation:
   ```bash
   npm list electron-icon-builder
   ```

3. Reinstall if needed:
   ```bash
   npm install --save-dev electron-icon-builder
   ```

### Blurry Icons

**Problem**: Icons appear blurry or pixelated

**Solutions**:
1. Ensure source PNG is at least 1024x1024 pixels
2. Verify transparency is preserved
3. Regenerate icons: `npm run icons:generate`
4. Check DPI settings on Windows (should work at 100%, 125%, 150%, 200%)

### Build Errors

**Problem**: Build fails with icon-related errors

**Solutions**:
1. Verify icon files exist:
   ```bash
   # Windows PowerShell
   Test-Path build/icon.ico
   Test-Path build/icon.icns
   
   # macOS/Linux
   ls -la build/icon.ico build/icon.icns
   ```

2. Check file permissions
3. Regenerate icons: `npm run icons:generate`
4. Verify electron-builder.json paths are correct

## Advanced Usage

### Custom Icon Sizes

To generate custom icon sizes, modify the electron-icon-builder command:

```bash
npx electron-icon-builder --input=./StorycoreIconeV2.png --output=./build --flatten --sizes=16,32,48,64,128,256,512,1024
```

### Manual Conversion

If automated generation fails, use online tools:

1. **PNG to ICO**: https://convertio.co/png-ico/
2. **PNG to ICNS**: https://cloudconvert.com/png-to-icns

### Validation

Verify generated icons:

```bash
# Check file signatures (Windows PowerShell)
$ico = [System.IO.File]::ReadAllBytes("build/icon.ico")
Write-Output "ICO signature: $($ico[0..3])"  # Should be: 0 0 1 0

# Check file sizes
Get-Item build/icon.ico, build/icon.icns | Select-Object Name, Length
```

## Best Practices

1. **Always use high-quality source**: Start with 1024x1024 PNG minimum
2. **Maintain transparency**: Ensure alpha channel is preserved
3. **Test at multiple sizes**: Verify clarity at 16x16 and 256x256
4. **Version control**: Commit generated icons for team consistency
5. **Automate in CI/CD**: Include icon generation in build pipeline
6. **Document changes**: Update changelog when icon changes

## Related Documentation

- [Build Assets README](../../build/README.md) - Detailed icon specifications
- [Electron Builder Docs](https://www.electron.build/icons) - Official icon configuration
- [App Icon Update Spec](../../.kiro/specs/app-icon-update/) - Implementation specification

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section above
2. Review [build/README.md](../../build/README.md) for detailed specs
3. Consult [Electron Builder documentation](https://www.electron.build/icons)
4. Open an issue on GitHub with:
   - Error messages
   - Operating system and version
   - Node.js and npm versions
   - Steps to reproduce
