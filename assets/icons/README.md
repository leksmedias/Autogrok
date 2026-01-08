# AutoGrok Icons

## Converting SVG to PNG

The extension requires PNG icons. To convert the provided SVG files to PNG:

### Option 1: Online Converter
1. Visit https://cloudconvert.com/svg-to-png
2. Upload `icon16.svg`, `icon48.svg`, `icon128.svg`
3. Convert to PNG
4. Download and place in this directory

### Option 2: ImageMagick (Command Line)
```bash
convert icon16.svg icon16.png
convert icon48.svg icon48.png
convert icon128.svg icon128.png
```

### Option 3: Use Your Own Icons
Simply replace with your own PNG icons:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels
- `icon128.png` - 128x128 pixels

## Temporary Workaround

For testing, Chrome will show a default extension icon if PNG files are missing.
The extension will still function normally.
