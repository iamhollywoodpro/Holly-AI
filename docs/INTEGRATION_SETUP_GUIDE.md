# HOLLY Integration Setup Guide — Phase 8

> Complete setup instructions for all Phase 8 external integrations.
> Each integration is independent — set up only the ones you need.

---

## 📧 Email Integration (Resend)

### What It Does
- Holly can send emails autonomously
- Proactive notification emails (insights, morning briefings)
- HTML emails with Holly branding

### Setup (5 minutes, FREE)

1. **Create Resend Account**
   - Go to https://resend.com/signup
   - Sign up with `iamdoregosteve@gmail.com`
   - Free tier: 100 emails/day, 3,000/month

2. **Get API Key**
   - Dashboard → API Keys → Create API Key
   - Name: `holly-production`
   - Copy the key (starts with `re_`)

3. **Verify Domain** (or use onboarding domain)
   - Quick start: Resend provides `onboarding@resend.dev` for testing
   - For production: Add your domain (nexamusicgroup.com) and verify DNS records

4. **Add to Coolify**
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=holly@nexamusicgroup.com
   ```

5. **Test**
   ```bash
   curl -X POST https://holly.nexamusicgroup.com/api/email/send \
     -H "Content-Type: application/json" \
     -d '{"to":"iamdoregosteve@gmail.com","subject":"Holly Email Test","body":"This is a test from Holly!"}'
   ```

---

## 📅 Calendar Integration (Google Calendar)

### What It Does
- Holly can create, list, and delete calendar events
- Morning briefing includes today's calendar
- Schedule meetings and reminders

### Setup (15 minutes, FREE)

1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com
   - Create new project: "HOLLY AI"
   - Enable Google Calendar API

2. **Create OAuth Credentials**
   - APIs & Services → Credentials → Create Credentials → OAuth Client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://holly.nexamusicgroup.com/api/calendar/oauth/callback`
   - Copy Client ID and Client Secret

3. **Add to Coolify**
   ```
   GOOGLE_CALENDAR_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
   GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
   ```

4. **Authorize**
   - Visit: `https://holly.nexamusicgroup.com/api/calendar/oauth`
   - Sign in with Google and authorize
   - Token is stored in UserPreference table

5. **Test**
   ```bash
   curl https://holly.nexamusicgroup.com/api/calendar/events
   ```

---

## 📱 SMS Integration (Twilio)

### What It Does
- Holly can send SMS messages
- Proactive insights and reminders via text
- Two-way conversation via SMS

### Setup (10 minutes, ~$1/month)

1. **Create Twilio Account**
   - Go to https://www.twilio.com/try-twilio
   - Sign up with `iamdoregosteve@gmail.com`
   - Free trial: $15 credit

2. **Get Phone Number**
   - Phone Numbers → Get a number
   - Choose a local number (~$1/month)
   - Copy the number (E.164 format: +1XXXXXXXXXX)

3. **Get Credentials**
   - Dashboard → Account Info
   - Copy Account SID and Auth Token

4. **Add to Coolify**
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxx
   TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
   ```

5. **Test**
   ```bash
   curl -X POST https://holly.nexamusicgroup.com/api/sms/send \
     -H "Content-Type: application/json" \
     -d '{"to":"+1YOUR_NUMBER","message":"Hello from Holly! 👋"}'
   ```

---

## 🎙️ LiveKit Voice (Real-Time Voice)

### What It Does
- Real-time voice conversation with Holly
- No STT→LLM→TTS latency (direct WebRTC)
- Voice activity detection, interruption handling

### Setup (20 minutes, FREE self-hosted)

1. **Generate API Keys**
   ```bash
   docker run livekit/generate-keys
   ```
   Copy the API Key and Secret.

2. **Add LiveKit to Docker Compose**
   - Copy the service from `docker/livekit-docker-compose.yml`
   - Add it to your `docker-compose.coolify.yml`

3. **Add to Coolify**
   ```
   LIVEKIT_API_KEY=APIxxxxxxxxxxxx
   LIVEKIT_API_SECRET=xxxxxxxxxxxx
   LIVEKIT_URL=ws://livekit:7880
   ```

4. **Open Firewall Ports** (Oracle Cloud)
   ```bash
   sudo iptables -I INPUT -p tcp --dport 7880 -j ACCEPT
   sudo iptables -I INPUT -p tcp --dport 7881 -j ACCEPT
   sudo iptables -I INPUT -p udp --dport 7882 -j ACCEPT
   sudo netfilter-persistent save
   ```

5. **Deploy**
   ```bash
   docker-compose -f docker-compose.coolify.yml up -d livekit
   ```

6. **Test**
   ```bash
   curl https://holly.nexamusicgroup.com/api/voice/livekit-token
   ```

---

## 📱 Mobile App (Expo EAS Build)

### What It Does
- Native iOS/Android app for Holly
- Push notifications
- Offline message queue

### Setup (1 hour, $25 one-time for Google Play)

1. **Install EAS CLI**
   ```bash
   cd mobile-app
   npm install -g eas-cli
   eas login
   ```

2. **Configure**
   - `app.json` already configured with EAS settings
   - Add app icons to `mobile-app/assets/`
   - Add splash screen to `mobile-app/assets/`

3. **Build Preview (APK for testing)**
   ```bash
   eas build --profile preview --platform android
   ```

4. **Build Production**
   ```bash
   eas build --profile production --platform android
   eas build --profile production --platform ios
   ```

5. **Submit to Stores**
   ```bash
   eas submit --platform android
   eas submit --platform ios
   ```

---

## 🖥️ Desktop App (Electron)

### What It Does
- Native desktop app with system tray
- Global hotkey (Cmd+Shift+H)
- Native notifications, always-on-top

### Setup (30 minutes, FREE)

1. **Install Dependencies**
   ```bash
   cd desktop-app
   npm install
   ```

2. **Run in Development**
   ```bash
   HOLLY_URL=https://holly.nexamusicgroup.com npm start
   ```

3. **Build for Distribution**
   ```bash
   npm run build:mac    # macOS
   npm run build:win    # Windows
   npm run build:linux  # Linux
   ```

4. **Output**
   - Built apps in `desktop-app/dist/`
   - macOS: `.dmg` file
   - Windows: `.exe` installer
   - Linux: `.AppImage`

---

## 🔑 Creator Recognition Setup

### Already Configured (Hardcoded)
Holly recognizes you via hardcoded identifiers — **no env vars needed**:
- Email: `iamdoregosteve@gmail.com` ✅
- Legacy email: `iamhollywoodpro@gmail.com` ✅
- Name fragments: `steve dorego`, `steve hollywood`, etc. ✅

### Optional: Add Clerk ID for Extra Reliability
1. Sign in to Holly with your new account
2. Check your Clerk user ID from the browser console
3. Add to Coolify env vars:
   ```
   CREATOR_CLERK_IDS=user_xxxxxxxxxxxx
   CREATOR_EMAILS=iamdoregosteve@gmail.com
   CREATOR_NAME_FRAGMENTS=steve dorego,steve hollywood,dorego
   ```

---

## ✅ Quick Checklist

| Integration | Cost | Setup Time | Status |
|-------------|------|------------|--------|
| Creator Recognition | FREE | 0 min | ✅ Hardcoded |
| Email (Resend) | FREE | 5 min | ⬜ Needs API key |
| Calendar (Google) | FREE | 15 min | ⬜ Needs OAuth |
| SMS (Twilio) | ~$1/mo | 10 min | ⬜ Needs account |
| LiveKit Voice | FREE | 20 min | ⬜ Needs Docker |
| Mobile App | $25 once | 1 hour | ⬜ Needs dev account |
| Desktop App | FREE | 30 min | ⬜ Needs build |
