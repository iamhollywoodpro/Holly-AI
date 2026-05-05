# HOLLY AI Browser Extension

Access HOLLY AI from anywhere in your browser!

## Features

- 🚀 **Quick Access** - Press `Ctrl+Shift+H` to open HOLLY
- 💬 **Context Menu** - Right-click selected text to ask HOLLY
- 🔔 **Notifications** - Get notified when tasks complete
- 📌 **Popup Interface** - Mini HOLLY in your toolbar
- ⌨️ **Keyboard Shortcuts** - Fast access with hotkeys

## Installation

### Chrome/Edge

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `browser-extension` folder

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from the `browser-extension` folder

## Development

### File Structure

```
browser-extension/
├── manifest.json       # Extension configuration
├── popup.html          # Popup interface
├── popup.js            # Popup logic
├── background.js       # Background service worker
├── content.js          # Content script for page integration
├── content.css         # Styles for injected elements
└── icons/              # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Building

```bash
# Install dependencies
npm install

# Build extension
npm run build:extension

# Package for distribution
npm run package:extension
```

## Usage

### Popup Interface

Click the HOLLY icon in your toolbar to open a mini chat interface.

### Context Menu

1. Select text on any webpage
2. Right-click and choose "Ask HOLLY"
3. HOLLY will analyze the selected text

### Keyboard Shortcuts

- `Ctrl+Shift+H` (Mac: `Cmd+Shift+H`) - Open HOLLY popup
- `Ctrl+Shift+Space` (Mac: `Cmd+Shift+Space`) - Quick chat

### Notifications

HOLLY will send browser notifications for:
- Task completions
- Music generation finished
- Code analysis results
- Important updates

## Permissions

- **storage** - Save your preferences and conversation history
- **contextMenus** - Add "Ask HOLLY" to right-click menu
- **notifications** - Send completion notifications
- **host_permissions** - Connect to holly.nexamusicgroup.com

## Privacy

- All data stays between you and HOLLY
- No third-party tracking
- Conversations are encrypted
- You control what data is stored

## Support

For issues or feature requests, visit:
https://github.com/iamhollywoodpro/Holly-AI/issues

## License

MIT License - See LICENSE file for details
