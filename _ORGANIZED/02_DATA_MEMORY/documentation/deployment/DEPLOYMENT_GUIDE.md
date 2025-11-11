# 🚀 HOLLY Music Studio - Deployment Guide

## Complete Step-by-Step Deployment Instructions

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### **Before You Start:**
- [ ] Have all 11 API keys ready (see `.env.example`)
- [ ] Supabase project created and configured
- [ ] GitHub repository set up
- [ ] Vercel/Netlify account ready
- [ ] Domain name (optional)

---

## 🗄️ STEP 1: DATABASE SETUP

### **1.1 Create Supabase Project:**
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization
4. Set project name: `holly-music-studio`
5. Generate strong database password
6. Select region (closest to your users)
7. Click "Create Project"

### **1.2 Run Database Schema:**

Execute the following SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Songs table
create table songs (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  audio_url text not null,
  image_url text,
  tags text,
  prompt text,
  language text,
  duration integer,
  artist_id uuid references artists(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Artists table
create table artists (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  style text,
  image_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Playlists table
create table playlists (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  user_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Playlist Songs junction table
create table playlist_songs (
  id uuid default uuid_generate_v4() primary key,
  playlist_id uuid references playlists(id) on delete cascade,
  song_id uuid references songs(id) on delete cascade,
  position integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(playlist_id, song_id)
);

-- Music Videos table
create table music_videos (
  id uuid default uuid_generate_v4() primary key,
  song_id uuid references songs(id) on delete cascade,
  video_url text not null,
  prompt text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Song Likes table (for future features)
create table song_likes (
  id uuid default uuid_generate_v4() primary key,
  song_id uuid references songs(id) on delete cascade,
  user_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(song_id, user_id)
);

-- Indexes for performance
create index songs_created_at_idx on songs(created_at desc);
create index songs_artist_id_idx on songs(artist_id);
create index songs_language_idx on songs(language);
create index playlist_songs_playlist_id_idx on playlist_songs(playlist_id);
create index playlist_songs_song_id_idx on playlist_songs(song_id);

-- Enable Row Level Security (RLS)
alter table songs enable row level security;
alter table artists enable row level security;
alter table playlists enable row level security;
alter table playlist_songs enable row level security;
alter table music_videos enable row level security;
alter table song_likes enable row level security;

-- Public access policies (adjust based on your needs)
create policy "Songs are viewable by everyone"
  on songs for select
  using (true);

create policy "Songs are insertable by everyone"
  on songs for insert
  with check (true);

create policy "Artists are viewable by everyone"
  on artists for select
  using (true);

create policy "Artists are insertable by everyone"
  on artists for insert
  with check (true);

create policy "Playlists are viewable by everyone"
  on playlists for select
  using (true);

create policy "Playlists are insertable by everyone"
  on playlists for insert
  with check (true);

-- ... (add similar policies for other tables)
```

### **1.3 Configure Storage Buckets:**

1. Go to **Storage** in Supabase
2. Create bucket: `artist-images`
   - Public bucket
   - File size limit: 5MB
   - Allowed MIME types: `image/png, image/jpeg, image/webp`

3. Create bucket: `song-covers`
   - Public bucket
   - File size limit: 10MB
   - Allowed MIME types: `image/png, image/jpeg, image/webp`

4. Create bucket: `music-videos`
   - Public bucket
   - File size limit: 100MB
   - Allowed MIME types: `video/mp4, video/webm`

---

## 🔑 STEP 2: API KEYS CONFIGURATION

### **2.1 Gather All API Keys:**

**Required (11 keys):**

1. **Supabase:**
   - URL: From Supabase project settings
   - Anon Key: From Supabase project settings
   - Service Role Key: From Supabase project settings (keep secret!)

2. **SunoAPI.org:**
   - Get from: [https://sunoapi.org/api-key](https://sunoapi.org/api-key)
   - Your key: `c3367b96713745a2de3b1f8e1dde4787` (already have)

3. **OpenAI:**
   - Get from: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

4. **Anthropic:**
   - Get from: [https://console.anthropic.com/](https://console.anthropic.com/)

5. **Groq:**
   - Get from: [https://console.groq.com/](https://console.groq.com/)

6. **Google AI Studio:**
   - Get from: [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

7. **ElevenLabs:**
   - Get from: [https://elevenlabs.io/](https://elevenlabs.io/)

8. **Minimax:**
   - Get from: [https://www.minimaxi.com/](https://www.minimaxi.com/)

9. **Runway:**
   - Get from: [https://runwayml.com/](https://runwayml.com/)

10. **GitHub Token:**
    - Generate from: [https://github.com/settings/tokens](https://github.com/settings/tokens)

### **2.2 Create Environment File:**

Copy `.env.example` to `.env.local` and fill in ALL values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://npypueptfceqyzklgclm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here

# SunoAPI.org
SUNOAPI_KEY=c3367b96713745a2de3b1f8e1dde4787

# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Groq
GROQ_API_KEY=gsk_...

# Google AI Studio
GOOGLE_AI_STUDIO_KEY=AI...

# ElevenLabs
ELEVENLABS_API_KEY=...

# Minimax
MINIMAX_API_KEY=...

# Runway
RUNWAY_API_KEY=...

# GitHub
GITHUB_TOKEN=ghp_...
```

**⚠️ IMPORTANT:** Never commit `.env.local` to Git!

---

## 🐙 STEP 3: GITHUB SETUP

### **3.1 Initialize Git Repository:**

```bash
cd /path/to/holly-FINAL-COMPLETE-v4
git init
git add .
git commit -m "Initial commit: HOLLY Music Studio v4"
```

### **3.2 Create GitHub Repository:**

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `holly-music-studio`
3. Description: "AI-powered music generation platform with 13 languages"
4. Private repository (recommended)
5. Don't initialize with README
6. Click "Create repository"

### **3.3 Push to GitHub:**

```bash
git remote add origin https://github.com/YOUR_USERNAME/holly-music-studio.git
git branch -M main
git push -u origin main
```

### **3.4 Add .gitignore:**

Ensure `.gitignore` includes:
```gitignore
# Environment
.env.local
.env*.local

# Dependencies
node_modules/

# Build
.next/
out/
dist/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

---

## ☁️ STEP 4: VERCEL DEPLOYMENT

### **4.1 Install Vercel CLI (Optional):**

```bash
npm install -g vercel
```

### **4.2 Deploy via Vercel Dashboard:**

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import from GitHub
4. Select `holly-music-studio` repository
5. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** ./
   - **Build Command:** `npm run build`
   - **Output Directory:** .next

### **4.3 Add Environment Variables:**

In Vercel project settings → Environment Variables, add ALL 11 keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUNOAPI_KEY=c3367b96713745a2de3b1f8e1dde4787
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
GOOGLE_AI_STUDIO_KEY=...
ELEVENLABS_API_KEY=...
MINIMAX_API_KEY=...
RUNWAY_API_KEY=...
GITHUB_TOKEN=...
```

**For each variable:**
- Environment: Production, Preview, Development
- Value: Paste your actual key
- Click "Save"

### **4.4 Deploy:**

1. Click "Deploy"
2. Wait for build to complete (~2-5 minutes)
3. Click "Visit" to see your live site!

---

## 🌐 STEP 5: CUSTOM DOMAIN (Optional)

### **5.1 Add Domain in Vercel:**

1. Go to Project → Settings → Domains
2. Enter your domain: `music.yourdomain.com`
3. Click "Add"

### **5.2 Configure DNS:**

Add these records to your DNS provider:

**For subdomain (music.yourdomain.com):**
```
Type: CNAME
Name: music
Value: cname.vercel-dns.com
```

**For apex domain (yourdomain.com):**
```
Type: A
Name: @
Value: 76.76.21.21

Type: AAAA
Name: @
Value: 2606:4700:4700::1111
```

### **5.3 Wait for Propagation:**
- DNS changes take 15-60 minutes
- Vercel will auto-provision SSL certificate
- Your site will be live at your custom domain!

---

## 🧪 STEP 6: POST-DEPLOYMENT TESTING

### **6.1 Functional Tests:**

**Create Tab:**
- [ ] Generate lyrics works
- [ ] Language auto-detection works
- [ ] Generate 2 versions works
- [ ] Songs appear in Library
- [ ] Toast notifications show

**Library Tab:**
- [ ] Songs load from database
- [ ] Search works
- [ ] Filters work
- [ ] Play/pause works
- [ ] Extend song works
- [ ] Remix song works
- [ ] Create video works
- [ ] Download works

**Artists Tab:**
- [ ] Create artist works
- [ ] AI image generates
- [ ] Artists display correctly
- [ ] Delete works

**Playlists Tab:**
- [ ] Create playlist works
- [ ] Playlists display correctly
- [ ] Delete works

### **6.2 Performance Tests:**

**Load Time:**
- [ ] Homepage loads < 2 seconds
- [ ] Music Studio loads < 3 seconds
- [ ] Library loads < 2 seconds

**API Response:**
- [ ] Generate song: 30-60 seconds
- [ ] Generate lyrics: 5-10 seconds
- [ ] Extend song: 30-60 seconds
- [ ] Remix song: 30-60 seconds

**Real-time:**
- [ ] New songs appear automatically
- [ ] No manual refresh needed

### **6.3 Error Handling:**

Test these scenarios:
- [ ] Invalid API key (should show error)
- [ ] Network timeout (should retry)
- [ ] Empty lyrics (should prevent generation)
- [ ] Missing required fields (should show validation)

---

## 📊 STEP 7: MONITORING & ANALYTICS

### **7.1 Vercel Analytics:**

1. Enable in Vercel dashboard
2. Monitor:
   - Page views
   - Load times
   - Error rates
   - User locations

### **7.2 Supabase Dashboard:**

Monitor:
- Database queries per second
- Storage usage
- Real-time connections
- API requests

### **7.3 Set Up Alerts:**

**Vercel:**
- Budget alerts (prevent surprise bills)
- Error rate alerts
- Performance degradation alerts

**Supabase:**
- Database size alerts (when approaching limit)
- API usage alerts
- Connection limit alerts

---

## 🔧 STEP 8: COMMON ISSUES & FIXES

### **Issue: Build Fails**

**Solution:**
```bash
# Clear cache and rebuild locally
rm -rf .next node_modules
npm install
npm run build

# If successful, push and redeploy
git add .
git commit -m "Fix build"
git push
```

### **Issue: Environment Variables Not Working**

**Solution:**
1. Check Vercel dashboard → Environment Variables
2. Ensure variables are set for all environments
3. Redeploy after adding variables

### **Issue: Database Connection Fails**

**Solution:**
1. Check Supabase URL is correct
2. Verify anon key is valid
3. Check RLS policies allow access
4. Test connection locally first

### **Issue: API Rate Limits**

**Solution:**
- SunoAPI.org: Check credit balance
- OpenAI: Upgrade to paid tier
- Implement request queuing
- Add retry logic with exponential backoff

---

## 🚀 STEP 9: PRODUCTION OPTIMIZATION

### **9.1 Performance:**

**Enable Vercel Speed Insights:**
```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

**Optimize Images:**
- Use Next.js `<Image>` component
- Enable image optimization in Vercel
- Serve WebP format

**Database Optimization:**
- Add indexes (already done)
- Enable connection pooling
- Use Supabase Edge Functions for heavy queries

### **9.2 Security:**

**Environment Variables:**
- Never expose service role key
- Rotate keys periodically
- Use Vercel Secret Management

**Rate Limiting:**
```typescript
// Add to API routes
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
```

**CORS:**
- Restrict API access to your domain
- Add CORS headers to API routes

### **9.3 SEO:**

**Add Metadata:**
```typescript
// app/layout.tsx
export const metadata = {
  title: 'HOLLY Music Studio - AI Music Generation',
  description: 'Create authentic music across 13 languages with AI',
  keywords: ['ai music', 'music generation', 'multilingual'],
  openGraph: {
    title: 'HOLLY Music Studio',
    description: 'AI-powered music generation platform',
    images: ['/og-image.png'],
  },
}
```

**Sitemap:**
```typescript
// app/sitemap.ts
export default function sitemap() {
  return [
    {
      url: 'https://yoursite.com',
      lastModified: new Date(),
    },
    {
      url: 'https://yoursite.com/music',
      lastModified: new Date(),
    },
  ]
}
```

---

## 📈 STEP 10: SCALING CONSIDERATIONS

### **When You Reach 1000+ Users:**

**Database:**
- Upgrade Supabase plan
- Enable connection pooling
- Consider read replicas

**API:**
- Implement caching (Redis)
- Use background job queues (BullMQ)
- Consider serverless functions

**Storage:**
- Move to CDN (Cloudflare)
- Implement lazy loading
- Compress media files

**Monitoring:**
- Add Sentry for error tracking
- Implement custom analytics
- Set up uptime monitoring

---

## ✅ DEPLOYMENT COMPLETE!

Your HOLLY Music Studio is now live! 🎉

**Final Checklist:**
- [ ] Site is accessible at production URL
- [ ] All features work in production
- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] Monitoring enabled
- [ ] Error tracking active
- [ ] Performance optimized
- [ ] Security hardened

**Next Steps:**
1. Share with beta users
2. Gather feedback
3. Monitor performance
4. Iterate based on usage
5. Add stem separation (Phase 6)
6. Scale as needed

---

**Questions? Issues?**
- Check Vercel logs for errors
- Review Supabase Dashboard for database issues
- Test locally first with `npm run dev`
- Review this guide for troubleshooting

**Hollywood, your Music Studio is LIVE! Let's make some hits! 🎸**
