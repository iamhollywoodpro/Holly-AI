# HOLLY AI Mobile App

Native iOS and Android app for HOLLY AI

## Overview

This directory contains the setup guide and resources for building HOLLY AI as a native mobile application using React Native.

## Features

- 📱 **Native Performance** - Fast, smooth, native feel
- 🔔 **Push Notifications** - Real-time updates
- 🎤 **Voice Input** - Native voice recognition
- 📸 **Camera Integration** - Scan and analyze images
- 💾 **Offline Mode** - Work without internet
- 🔐 **Biometric Auth** - Face ID / Touch ID / Fingerprint
- 🌙 **Dark Mode** - System-integrated dark mode
- 📍 **Location Services** - Context-aware features

## Tech Stack

- **Framework**: React Native + Expo
- **Language**: TypeScript
- **State Management**: Zustand
- **Navigation**: React Navigation
- **UI Components**: React Native Paper + Custom
- **Backend**: Same as web (holly.nexamusicgroup.com)

## Setup

### Prerequisites

```bash
# Install Node.js (v18+)
# Install Expo CLI
npm install -g expo-cli

# Install EAS CLI (for building)
npm install -g eas-cli
```

### Initialize Project

```bash
# Create new Expo project
cd mobile-app
npx create-expo-app holly-ai --template

# Install dependencies
cd holly-ai
npm install @react-navigation/native
npm install @react-navigation/stack
npm install @react-navigation/bottom-tabs
npm install react-native-paper
npm install zustand
npm install axios
npm install @react-native-async-storage/async-storage
npm install expo-notifications
npm install expo-camera
npm install expo-speech
npm install expo-av
```

### Project Structure

```
mobile-app/holly-ai/
├── app/                    # App screens (Expo Router)
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Chat screen
│   │   ├── music.tsx      # Music Studio
│   │   ├── aura.tsx       # AURA Lab
│   │   └── profile.tsx    # User profile
│   ├── _layout.tsx        # Root layout
│   └── +not-found.tsx     # 404 screen
├── components/            # Reusable components
│   ├── Chat/
│   ├── Voice/
│   └── UI/
├── hooks/                 # Custom hooks
├── services/              # API services
├── store/                 # Zustand stores
├── utils/                 # Utilities
├── constants/             # Constants & config
├── assets/                # Images, fonts, etc.
└── app.json               # Expo configuration
```

## Development

### Run on Simulator/Emulator

```bash
# iOS (requires Mac)
npm run ios

# Android
npm run android

# Web (for testing)
npm run web
```

### Run on Physical Device

```bash
# Start Expo dev server
npm start

# Scan QR code with:
# - iOS: Camera app
# - Android: Expo Go app
```

## Building

### Development Build

```bash
# Configure EAS
eas login
eas build:configure

# Build for iOS
eas build --platform ios --profile development

# Build for Android
eas build --platform android --profile development
```

### Production Build

```bash
# iOS (App Store)
eas build --platform ios --profile production

# Android (Google Play)
eas build --platform android --profile production
```

## Key Components

### 1. Chat Interface

```typescript
// app/(tabs)/index.tsx
import { ChatScreen } from '@/components/Chat/ChatScreen';

export default function HomeScreen() {
  return <ChatScreen />;
}
```

### 2. Voice Input

```typescript
// components/Voice/VoiceInput.tsx
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

export function VoiceInput() {
  // Voice recognition implementation
}
```

### 3. Push Notifications

```typescript
// services/notifications.ts
import * as Notifications from 'expo-notifications';

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') {
    const token = await Notifications.getExpoPushTokenAsync();
    return token;
  }
}
```

### 4. Offline Storage

```typescript
// services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveConversation(id: string, data: any) {
  await AsyncStorage.setItem(`conversation_${id}`, JSON.stringify(data));
}
```

## App Configuration

### app.json

```json
{
  "expo": {
    "name": "HOLLY AI",
    "slug": "holly-ai",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0A0A0F"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.nexamusicgroup.holly",
      "buildNumber": "1.0.0"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0A0A0F"
      },
      "package": "com.nexamusicgroup.holly",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "NOTIFICATIONS"
      ]
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#00F0FF"
        }
      ]
    ]
  }
}
```

## Features Implementation

### Voice Commands

```typescript
// hooks/useVoiceCommands.ts
import { useEffect } from 'react';
import * as Speech from 'expo-speech';

export function useVoiceCommands() {
  useEffect(() => {
    // Listen for "Hey HOLLY"
    // Implement voice command recognition
  }, []);
}
```

### Camera Integration

```typescript
// components/Camera/CameraView.tsx
import { Camera } from 'expo-camera';

export function CameraView() {
  // Scan documents, analyze images
}
```

### Biometric Auth

```typescript
// services/auth.ts
import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticateWithBiometrics() {
  const result = await LocalAuthentication.authenticateAsync();
  return result.success;
}
```

## Publishing

### iOS App Store

1. Build production IPA
2. Upload to App Store Connect
3. Fill app information
4. Submit for review

### Google Play Store

1. Build production AAB
2. Create app in Play Console
3. Upload AAB
4. Fill store listing
5. Submit for review

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check
```

## Performance Optimization

- Use React.memo for expensive components
- Implement virtualized lists for long conversations
- Lazy load images and media
- Cache API responses
- Use native drivers for animations

## Troubleshooting

### Common Issues

**Build fails:**
```bash
# Clear cache
expo start -c
```

**Metro bundler issues:**
```bash
# Reset Metro
npx react-native start --reset-cache
```

**iOS simulator not starting:**
```bash
# Reset simulator
xcrun simctl erase all
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Play Store Guidelines](https://play.google.com/about/developer-content-policy/)

## Support

For issues or questions:
- GitHub: https://github.com/iamhollywoodpro/Holly-AI/issues
- Email: support@nexamusicgroup.com

## License

MIT License - See LICENSE file for details
