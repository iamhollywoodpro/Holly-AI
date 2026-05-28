# Holly AI Mobile — Assets

This directory should contain the following image assets:

## Required Assets

| File | Size | Description |
|------|------|-------------|
| `icon.png` | 1024×1024 | App icon — Holly logo on dark background (#0a060e) |
| `splash.png` | 1242×2436 | Splash screen — Holly logo centered on dark background |
| `adaptive-icon.png` | 1024×1024 | Android adaptive icon foreground (no background) |
| `notification-icon.png` | 96×96 | Notification icon — monochrome white on transparent |

## How to Generate

### Option A: Use Expo's default placeholders
```bash
npx expo-cli generate-icons
```

### Option B: Design manually
- Use the Holly brand colors: cyan (#22d3ee), purple (#9d25f4), pink (#ec4899)
- Background: #0a060e
- Follow Expo asset specs: https://docs.expo.dev/guides/app-icons/

## Note
These are placeholder references in `app.json`. Replace with actual PNG files before building.
The app will use Expo's default icon if these files are missing during development.
