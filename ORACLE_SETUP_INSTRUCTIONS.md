# 🗣️ Oracle Cloud AI Speech Setup for HOLLY 3.1

## MAYA1 Voice Integration - Complete Setup Guide

---

## ✅ What's Already Done

I've created the complete Oracle Cloud integration for HOLLY:

1. **Configuration** (`src/lib/oracle/config.ts`)
   - All your Oracle Cloud credentials pre-configured
   - MAYA1 voice settings ready
   - Region set to `ca-toronto-1`

2. **Authentication** (`src/lib/oracle/auth.ts`)
   - Request signing for Oracle Cloud API
   - Credential verification
   - Security handling

3. **Speech Service** (`src/lib/oracle/speech.ts`)
   - Text-to-speech generation with MAYA1
   - Audio format conversion
   - HOLLY-specific voice shortcuts

4. **API Route** (`app/api/speech/route.ts`)
   - `/api/speech` endpoint for voice generation
   - Connection testing
   - Error handling

5. **React Component** (`src/components/holly/VoiceButton.tsx`)
   - Voice playback button
   - Loading states
   - Audio controls

---

## 🔑 What You Need to Do

### **Step 1: Add Your Private Key File**

You need to add the `.pem` file that Oracle generated when you created your API key.

**Option A: Save the file in the project root**
```bash
# Place your .pem file in the Holly-AI folder
# Name it: oracle-private-key.pem
```

**Option B: Use a custom location**
```bash
# Save the .pem file anywhere on your system
# Then update .env.local with the full path
ORACLE_PRIVATE_KEY_PATH="/full/path/to/your-key.pem"
```

**Your .pem file looks like this:**
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
(many lines of base64 encoded key)
...
-----END PRIVATE KEY-----
```

---

### **Step 2: Update Environment Variables**

Add these to your `.env.local` file:

```bash
# Oracle Cloud Configuration
ORACLE_TENANCY_OCID=ocid1.tenancy.oc1..aaaaaaaadkua7gx2nybz4vvaklgyaocqsrhvh33rsw3znqymj27e3nkizfmq
ORACLE_USER_OCID=ocid1.user.oc1..aaaaaaaabwt7bpk7dpgkhxiln6ycv26go2nmk7jzq5fdizgizbj6n64pabma
ORACLE_FINGERPRINT=cf:fe:02:e5:6b:f0:fe:69:0d:78:93:cc:2b:b0:37:b8
ORACLE_REGION=ca-toronto-1
ORACLE_PRIVATE_KEY_PATH=./oracle-private-key.pem

# Optional: Specific compartment (defaults to tenancy root)
# ORACLE_COMPARTMENT_OCID=ocid1.compartment.oc1..your-compartment-id
```

---

### **Step 3: Test the Connection**

Once you've added your private key, test the Oracle connection:

```bash
# Test from command line
curl http://localhost:3000/api/speech

# Or use the test script
npm run test:oracle
```

**Expected response:**
```json
{
  "status": "connected",
  "message": "Successfully connected to Oracle AI Speech with MAYA1 voice",
  "duration": 1234,
  "voice": "MAYA1",
  "region": "ca-toronto-1"
}
```

---

## 🎤 Using HOLLY's Voice

### **In React Components**

```tsx
import { VoiceButton } from '@/components/holly/VoiceButton';

function MyComponent() {
  return (
    <VoiceButton 
      text="Hello Hollywood! I'm HOLLY, ready to assist you."
    />
  );
}
```

### **Directly via API**

```typescript
// Generate speech
const response = await fetch('/api/speech', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Your text here',
    voice: 'MAYA1',
    speakingRate: 1.0,
    pitch: 0.0
  })
});

const data = await response.json();
// data.audioContent contains base64 encoded audio
```

### **Using HOLLY Shortcuts**

```typescript
import { HOLLY } from '@/lib/oracle';

// Greeting
const greetAudio = await HOLLY.greet('Hollywood');

// Confirmation
const confirmAudio = await HOLLY.confirm('deploying to production');

// Completion
const completeAudio = await HOLLY.complete('Dashboard integration');

// Error
const errorAudio = await HOLLY.error('API connection timeout');
```

---

## 📊 Voice Configuration Options

### **Speaking Rate**
- `0.5` - Half speed (slow)
- `1.0` - Normal speed (default)
- `2.0` - Double speed (fast)

### **Pitch**
- `-10.0` to `-1.0` - Lower pitch
- `0.0` - Natural pitch (default)
- `1.0` to `10.0` - Higher pitch

### **Volume**
- `-20.0` to `0.0` - Quieter
- `0.0` - Normal volume (default)
- `0.0` to `20.0` - Louder

### **Output Formats**
- `MP3` - Default, best compatibility
- `WAV` - Uncompressed, highest quality
- `OGG` - Open format, good compression

---

## 🔧 Troubleshooting

### **Error: "Private key file not found"**
- Ensure your `.pem` file is in the correct location
- Check the `ORACLE_PRIVATE_KEY_PATH` in `.env.local`
- Verify file permissions (file should be readable)

### **Error: "Invalid private key format"**
- Ensure the file is a valid PEM-formatted private key
- File must start with `-----BEGIN PRIVATE KEY-----`
- File must end with `-----END PRIVATE KEY-----`

### **Error: "Authentication failed"**
- Verify your OCIDs are correct
- Check your fingerprint matches the uploaded public key
- Ensure your API key is active in Oracle Cloud Console

### **Error: "Region not found"**
- Verify `ca-toronto-1` is your correct region
- Check Oracle Cloud Console → Profile → Region

---

## 📁 File Structure

```
Holly-AI/
├── oracle-private-key.pem          # Your private key (add this)
├── .env.local                       # Environment variables
├── src/
│   └── lib/
│       └── oracle/
│           ├── config.ts            # Configuration ✅
│           ├── auth.ts              # Authentication ✅
│           ├── speech.ts            # Speech service ✅
│           └── index.ts             # Exports ✅
├── app/
│   └── api/
│       └── speech/
│           └── route.ts             # API endpoint ✅
└── src/
    └── components/
        └── holly/
            └── VoiceButton.tsx      # Voice button ✅
```

---

## 🎯 Next Steps After Setup

1. **Test Connection** - Verify Oracle Cloud integration works
2. **Add Voice to Dashboard** - Integrate VoiceButton components
3. **Create HOLLY 3.1 Backup** - Full backup with voice capabilities
4. **Deploy to Production** - Push to Vercel with Oracle credentials

---

## ⚠️ Security Notes

- **NEVER commit your `.pem` file to git**
- Add `oracle-private-key.pem` to `.gitignore`
- Store credentials securely in environment variables
- Use different keys for development and production

---

## 💡 Quick Start Checklist

- [ ] Download `.pem` file from Oracle Cloud Console
- [ ] Save as `oracle-private-key.pem` in project root
- [ ] Add Oracle credentials to `.env.local`
- [ ] Test connection: `curl http://localhost:3000/api/speech`
- [ ] Try VoiceButton component in dashboard
- [ ] Generate HOLLY 3.1 backup

---

**Once you've added your private key, HOLLY will have her MAYA1 voice! 🗣️**

Let me know when it's done and I'll create the HOLLY 3.1 backup!
