# CSP Placeholder Image Fix

## Problem
The application was attempting to load placeholder images from `https://via.placeholder.com`, which violated the Content Security Policy (CSP) directive:

```
Refused to load the image 'https://via.placeholder.com/512x512.png?text=Panel+panel-0-0' 
because it violates the following Content Security Policy directive
```

## Solution
Replaced all external placeholder URLs with locally-generated data URIs to comply with CSP restrictions.

### Changes Made

1. **Created Placeholder Utility** (`src/utils/placeholderImage.ts`)
   - `generatePlaceholderDataUrl()`: Generates canvas-based placeholder images
   - `getCachedPlaceholder()`: Caches generated placeholders for performance
   - Supports custom dimensions, text, and colors
   - Returns data URIs that comply with CSP `data:` directive

2. **Updated GridAPIService** (`src/services/gridEditor/GridAPIService.ts`)
   - Imported `getCachedPlaceholder` utility
   - Modified `generateMockImageUrl()` to use local placeholders
   - Generates 512x512 panel placeholders with panel IDs

3. **Updated ResultService** (`src/services/resultService.ts`)
   - Imported `getCachedPlaceholder` utility
   - Added `generatePlaceholderImage()` helper method
   - Replaced external URLs for generated images (800x600) and thumbnails (200x150)

4. **Updated CSP Policy** (`index.html`)
   - Removed `https://via.placeholder.com` from `img-src` directive
   - Now only allows: `'self' data: blob:`
   - More secure and restrictive policy

## Benefits

✅ **CSP Compliant**: No more CSP violations in console  
✅ **Offline Support**: Works without internet connection  
✅ **Performance**: Cached placeholders reduce regeneration  
✅ **Customizable**: Easy to adjust colors, sizes, and text  
✅ **Security**: Eliminates external image dependencies  

## Technical Details

The placeholder generator uses HTML5 Canvas API to create images with:
- Configurable dimensions
- Background color (#1a1a2e - dark theme)
- Border color (#6366f1 - indigo accent)
- Centered text with automatic wrapping
- Font size scaled to canvas dimensions

Generated images are converted to PNG data URIs and cached in memory for reuse.

## Testing

All modified files pass TypeScript diagnostics with no errors.

To verify the fix:
1. Clear browser cache
2. Reload the application
3. Check browser console - no CSP violations
4. Grid editor and result previews display local placeholders
