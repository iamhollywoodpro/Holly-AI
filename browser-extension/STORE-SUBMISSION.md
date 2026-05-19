# HOLLY AI Browser Extension - Store Submission Guide

## Chrome Web Store Assets Needed

### Icons (REQUIRED - now auto-generated)
- `icons/icon16.png` - 16x16 toolbar icon
- `icons/icon48.png` - 48x48 extension management
- `icons/icon128.png` - 128x128 Chrome Web Store

Run `./icons/generate-icons.sh` to regenerate from source.

### Promotional Images (NEEDED FOR SUBMISSION)
- Small tile: 440x280 PNG - Shows on Chrome Web Store listing
- Large tile: 1400x560 PNG - Optional, shows on detail page
- Screenshot: 1400x900 PNG (1-5 screenshots) - Shows Holly in action

Suggested screenshots:
1. Popup chat interface with a conversation
2. Right-click context menu "Ask HOLLY about this"
3. Floating widget on a webpage
4. Settings panel

### Listing Copy

**Name**: HOLLY AI
**Short description** (132 chars max): Self-Evolving AI Partner - Chat, analyze, and create from any webpage

**Detailed description**:

HOLLY is your self-evolving AI partner. Access her intelligence from any webpage.

Features:
- Chat with HOLLY in a sleek popup (Cmd/Ctrl+Shift+H)
- Right-click any text and ask HOLLY about it
- Quick chat floating widget on any page (Cmd/Ctrl+Shift+Space)
- Streaming responses with voice input support
- Conversation history within sessions
- Custom server URL and API key configuration

HOLLY understands context, remembers conversations, and gets smarter over time. She can help with research, writing, coding, analysis, music production, and creative tasks.

**Category**: Productivity
**Language**: English

### Privacy Policy (REQUIRED)

**HOLLY AI Browser Extension Privacy Policy**

This extension:
- Does NOT collect personal data
- Does NOT track browsing history
- Does NOT inject ads or modify page content beyond the chat widget
- Stores only your API key and server URL locally in Chrome storage (sync)
- Sends messages only to your configured HOLLY server URL
- All data processing happens on your self-hosted HOLLY instance

Data stored locally:
- Server URL (chrome.storage.sync)
- API key (chrome.storage.sync)
- Streaming preference (chrome.storage.sync)

No data is sent to any third-party servers. All communication is between your browser and your configured HOLLY server.

### Permissions Justification

- `storage`: Store your server URL and API key preferences
- `contextMenus`: Add "Ask HOLLY" right-click menu items
- `notifications`: Show desktop notifications when HOLLY responds
- `host_permissions` (holly.nexamusicgroup.com): Communicate with your HOLLY server
- `content_scripts` (all_urls): Inject the floating chat widget on pages

### Firefox Compatibility

The extension uses Manifest V3 which is supported by:
- Chrome 88+
- Edge 88+
- Firefox 109+ (with minor manifest adjustments)

For Firefox submission, change `manifest_version` to 2 if needed, and replace `service_worker` with `scripts` in the background section.

### Edge Compatibility

The extension is fully compatible with Microsoft Edge as-is. Submit to the Edge Add-ons store using the same package.
