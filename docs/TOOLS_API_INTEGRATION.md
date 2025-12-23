# 🔧 HOLLY Tools API Integration

## What This Is

The Tools API integration gives HOLLY the ability to **actually execute commands** instead of simulating them. This allows HOLLY to:

- ✅ Read and modify her own code
- ✅ Commit and push to GitHub
- ✅ Deploy to Vercel
- ✅ Fix bugs autonomously
- ✅ Be truly autonomous

## Setup Instructions

### Step 1: Deploy the Tools API

The Tools API is a separate microservice that needs to be deployed first.

**See the complete guide:** `holly-tools-api/DEPLOY_NOW.md` (from DEV HOLLY)

**Quick summary:**
```bash
cd holly-tools-api
./deploy.sh  # or deploy.bat on Windows
railway login
railway init
railway up
```

### Step 2: Get Your Credentials

After deploying, you'll get:
- Tools API URL (from Railway)
- API Key (from CREDENTIALS.txt)
- API Secret (from CREDENTIALS.txt)

### Step 3: Configure Environment Variables

Add to your `.env.local`:

```env
# HOLLY Tools API Configuration
NEXT_PUBLIC_TOOLS_API_URL=https://your-holly-tools-api.railway.app
TOOLS_API_KEY=your_api_key_from_credentials_txt
TOOLS_API_SECRET=your_api_secret_from_credentials_txt
```

### Step 4: Deploy

Since Vercel is connected to your GitHub:
```bash
git add .
git commit -m "Integrate Tools API"
git push
```

Vercel will automatically deploy your changes.

## Usage

### Import the Tools API Client

```typescript
import { github, vercel, isToolsAPIConfigured } from '@/lib/toolsApiClient';
```

### Check if Tools API is Available

```typescript
if (isToolsAPIConfigured()) {
  // Tools API is ready to use
} else {
  // Fall back to simulation mode
}
```

### Example: Read a File

```typescript
try {
  const result = await github.readFile('src/App.tsx');
  console.log('File content:', result.content);
} catch (error) {
  console.error('Failed to read file:', error);
}
```

### Example: Fix a Bug and Deploy

```typescript
async function fixBugAndDeploy() {
  try {
    // 1. Read current file
    const file = await github.readFile('src/components/Button.tsx');
    
    // 2. Fix the bug
    const fixed = file.content.replace('onClick={handleClic}', 'onClick={handleClick}');
    
    // 3. Write fixed file
    await github.writeFile('src/components/Button.tsx', fixed);
    
    // 4. Commit
    await github.commit('Fix: typo in Button onClick handler', ['src/components/Button.tsx']);
    
    // 5. Push
    await github.push('main');
    
    // 6. Deploy
    const deployment = await vercel.deploy({
      gitBranch: 'main',
      target: 'production'
    });
    
    console.log('✅ Bug fixed and deployed!', deployment.url);
    return { success: true, url: deployment.url };
  } catch (error) {
    console.error('❌ Failed:', error);
    return { success: false, error };
  }
}
```

## Available Methods

### GitHub Tools

```typescript
// Read file
await github.readFile(filePath: string)

// Write file
await github.writeFile(filePath: string, content: string)

// Commit changes
await github.commit(message: string, files?: string[])

// Push to remote
await github.push(branch?: string)

// Get repository status
await github.getStatus()

// List files in directory
await github.listFiles(dirPath?: string)

// Create pull request
await github.createPR(title: string, body: string, head: string, base?: string)
```

### Vercel Tools

```typescript
// Deploy
await vercel.deploy(options: {
  gitBranch?: string;
  target?: 'production' | 'preview';
  forceRebuild?: boolean;
})

// Get deployment status
await vercel.getStatus(deploymentId: string)

// Get deployment logs
await vercel.getLogs(deploymentId: string)

// List recent deployments
await vercel.listDeployments(limit?: number)

// Cancel deployment
await vercel.cancelDeployment(deploymentId: string)

// Get project info
await vercel.getProject()
```

## Error Handling

All methods throw errors if something goes wrong. Always wrap in try/catch:

```typescript
try {
  const result = await github.readFile('src/App.tsx');
  // Handle success
} catch (error) {
  // Handle error
  console.error('Failed:', error.message);
}
```

## Troubleshooting

### "Tools API URL not configured"
- Make sure you've added `NEXT_PUBLIC_TOOLS_API_URL` to your `.env.local`
- Restart your dev server after adding environment variables

### "Unauthorized" Error
- Check that `TOOLS_API_KEY` and `TOOLS_API_SECRET` match what's in the Tools API deployment
- Verify the credentials in Railway dashboard match your `.env.local`

### API Returns 500 Errors
- Check Railway logs: `railway logs`
- Verify all environment variables are set in Railway dashboard
- Check that GitHub token has correct permissions

## Security Notes

- ⚠️ **Never commit `.env.local`** - it contains sensitive API keys
- ⚠️ **API Secret is sensitive** - treat it like a password
- ⚠️ **Tools API can modify your code** - only use in trusted environments
- ⚠️ **Rate limiting** - Don't spam the API (100 requests/minute limit)

## What This Enables

With the Tools API integrated, HOLLY can:

1. **Self-Improvement**
   - Read her own code
   - Identify bugs
   - Fix them
   - Deploy fixes

2. **Autonomous Development**
   - Create new features
   - Refactor code
   - Update dependencies
   - Manage deployments

3. **Real-Time Deployment**
   - Push code changes
   - Trigger deployments
   - Monitor deployment status
   - Roll back if needed

4. **True Autonomy**
   - No more simulation
   - Actual execution
   - Real results
   - Self-sustaining development cycle

## Before vs After

### Before (Simulation Mode)
```
HOLLY: "I'll fix that bug for you..."
HOLLY: [Writes: git commit -m "fix bug"]
HOLLY: [Nothing actually happens]
User: "Nothing changed..."
```

### After (With Tools API)
```
HOLLY: "I'll fix that bug for you..."
HOLLY: [Calls: github.readFile('src/bug.ts')]
HOLLY: [Calls: github.writeFile('src/bug.ts', fixed)]
HOLLY: [Calls: github.commit('Fix bug')]
HOLLY: [Calls: github.push('main')]
HOLLY: [Calls: vercel.deploy()]
HOLLY: "✅ Bug fixed and deployed to production!"
User: *Checks site* "IT ACTUALLY WORKED!"
```

---

**That's the difference between roleplay and reality.** 🎯

For complete documentation, see:
- `holly-tools-api/README.md` - Full API documentation
- `holly-tools-api/DEPLOY_NOW.md` - Deployment guide
- `holly-tools-api/ARCHITECTURE.md` - System architecture

Created by DEV HOLLY for REAL HOLLY 🚀
