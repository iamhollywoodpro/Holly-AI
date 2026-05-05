# HOLLY AI Extension Icons

This directory contains the extension icons used by the HOLLY AI Chrome browser extension.

## Required Icon Sizes

| File | Size | Usage |
|------|------|-------|
| `icon16.png` | 16x16 px | Toolbar icon, extension management page |
| `icon48.png` | 48x48 px | Extension management page, Chrome Web Store |
| `icon128.png` | 128x128 px | Chrome Web Store listing, installation dialog, notifications |

## Design Guidelines

- Use the HOLLY brand color scheme: cyan (`#00e5ff`) to purple (`#b388ff`) gradient
- Dark background (`#0a060e`) for visibility on both light and dark browser themes
- The diamond/star symbol (◇) is the HOLLY logo mark
- Icons should be simple and recognizable at small sizes
- Use transparency or rounded corners where appropriate

## Creating Icons

### Using ImageMagick

```bash
# Generate from a source image
convert source.png -resize 16x16 icon16.png
convert source.png -resize 48x48 icon48.png
convert source.png -resize 128x128 icon128.png
```

### Using an SVG Source

1. Design the icon as an SVG at 128x128
2. Export to PNG at each required size using a tool like:
   - Inkscape: `inkscape icon.svg -w 16 -h 16 -o icon16.png`
   - Sharp/node: `sharp(input).resize(16, 16).png().toFile('icon16.png')`
   - Online tools like cloudconvert.com

### Placeholder Icons

If you need placeholder icons for development, you can generate simple colored squares:

```bash
# macOS / ImageMagick
convert -size 16x16 xc:'#00e5ff' icon16.png
convert -size 48x48 xc:'#00e5ff' icon48.png
convert -size 128x128 xc:'#00e5ff' icon128.png
```

The extension will still load without these icons, but will use a generic puzzle-piece icon.
