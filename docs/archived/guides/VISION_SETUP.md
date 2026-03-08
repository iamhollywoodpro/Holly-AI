# 👁️ HOLLY Vision System - Setup Guide

## Overview

HOLLY's multi-model vision system gives her the ability to "see" and understand images uploaded by users. The system intelligently selects the best AI model based on the task:

- **GPT-4 Vision (OpenAI)**: Best for design critique, complex analysis
- **BLIP (Salesforce/Hugging Face)**: Best for fast, detailed image captioning
- **Google Cloud Vision**: Best for OCR (text extraction) and label detection

## Features

✅ **Auto-Vision Processing**: Images uploaded to chat are automatically analyzed
✅ **Multi-Model Support**: Uses multiple AI models for comprehensive understanding
✅ **Smart Model Selection**: Chooses the best model based on task type
✅ **Rich Descriptions**: Provides detailed, structured image descriptions
✅ **Seamless Integration**: Vision context automatically injected into HOLLY's responses

---

## Setup Instructions

### 1. Required API Keys

You need **at least one** of these API keys (GPT-4 Vision is recommended):

#### **OpenAI (GPT-4 Vision)** - RECOMMENDED ⭐
- **Why**: Best for design critique, complex image understanding
- **Cost**: ~$0.01-0.03 per image (depending on detail level)
- **Get Key**: https://platform.openai.com/api-keys
- **Free Credits**: $5 free for new accounts

```bash
OPENAI_API_KEY=sk-proj-...
```

#### **Hugging Face (BLIP)** - FREE ⭐
- **Why**: Fast captioning, no cost
- **Cost**: FREE (with rate limits)
- **Get Key**: https://huggingface.co/settings/tokens
- **Note**: May have slower inference for free tier

```bash
HUGGINGFACE_API_KEY=hf_...
```

#### **Google Cloud Vision** - OPTIONAL
- **Why**: Best OCR, label detection
- **Cost**: 1,000 requests/month free, then $1.50/1000 images
- **Get Key**: https://cloud.google.com/vision/docs/setup
- **Note**: Requires Google Cloud project setup

```bash
GOOGLE_VISION_API_KEY=AIza...
```

---

### 2. Add to Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the API key(s):
   - **Key**: `OPENAI_API_KEY` (or `HUGGINGFACE_API_KEY`, `GOOGLE_VISION_API_KEY`)
   - **Value**: Your API key
   - **Environments**: Select all (Production, Preview, Development)
4. Click **Save**
5. **Redeploy** your project for changes to take effect

---

### 3. Local Development Setup

Create or update your `.env.local` file:

```bash
# Required - at least one vision API key
OPENAI_API_KEY=sk-proj-your-key-here

# Optional - additional models
HUGGINGFACE_API_KEY=hf_your-key-here
GOOGLE_VISION_API_KEY=AIza-your-key-here

# Existing keys (keep these)
CLERK_SECRET_KEY=...
DATABASE_URL=...
BLOB_READ_WRITE_TOKEN=...
```

---

## How It Works

### User Workflow

1. **Upload Image** → User uploads an image via chat
2. **Auto-Processing** → Image automatically sent to Vision API
3. **Description Generated** → AI generates detailed description
4. **Context Injection** → Description added to HOLLY's context
5. **HOLLY Responds** → HOLLY sees the image and responds intelligently

### Example

**User uploads**: `screenshot-dashboard.png`

**Vision Analysis**:
```json
{
  "model": "gpt-4o-vision",
  "summary": "A dark-themed analytics dashboard with multiple charts and metrics",
  "keyElements": ["bar chart", "line graph", "metrics cards", "sidebar navigation"],
  "description": "This is a professional analytics dashboard with a dark theme..."
}
```

**HOLLY sees**:
```
[Attached Images - What HOLLY Sees]:

Image 1 (screenshot-dashboard.png):
  Summary: A dark-themed analytics dashboard with multiple charts and metrics
  Key Elements: bar chart, line graph, metrics cards, sidebar navigation
  Full Description: This is a professional analytics dashboard with a dark theme...
```

**HOLLY responds**: "I can see you're working on an analytics dashboard! The dark theme looks great, and I notice you have bar charts and line graphs. Would you like me to help improve the data visualization or suggest design enhancements?"

---

## API Usage & Costs

### GPT-4 Vision (OpenAI)
- **Input**: $10.00 / 1M tokens
- **Output**: $30.00 / 1M tokens
- **Images**: ~$0.01-0.03 per image
- **Free Credits**: $5 for new accounts
- **Recommendation**: Best balance of quality and cost

### BLIP (Hugging Face)
- **Cost**: FREE (rate limits apply)
- **Speed**: 2-5 seconds per image
- **Quality**: Good for general descriptions
- **Recommendation**: Use as fallback or for high-volume needs

### Google Cloud Vision
- **Cost**: 1,000 requests/month FREE, then $1.50/1000
- **Speed**: <1 second per image
- **Quality**: Excellent for OCR and labels
- **Recommendation**: Use for text extraction tasks

---

## Testing Vision System

### 1. Check Vision API Status

```bash
curl https://holly.nexamusicgroup.com/api/vision/analyze-enhanced?action=status
```

Expected response:
```json
{
  "status": "online",
  "models": ["gpt-4o-vision", "blip-large", "google-vision"],
  "capabilities": ["image-analysis", "design-critique", "ocr", "comparison", "art-style-analysis"]
}
```

### 2. Test Image Upload

1. Go to https://holly.nexamusicgroup.com
2. Upload an image via chat
3. Check console logs for vision processing
4. Look for "👁️ Processing image with vision..." message
5. HOLLY's response should reference image content

### 3. Check Logs

In browser console:
```
[Upload] ✅ File uploaded: https://...
[Upload] 👁️  Processing image with vision...
[Upload] ✅ Vision analysis complete: A dark-themed analytics dashboard...
```

---

## Troubleshooting

### Vision processing failed
- **Check API key** is set in Vercel environment variables
- **Verify key permissions** (OpenAI: full access, HF: inference API)
- **Check rate limits** (free tiers have limits)
- **Redeploy** after adding environment variables

### Images uploaded but no vision context
- **Check browser console** for errors
- **Verify image format** (PNG, JPG, WebP supported)
- **Check image size** (<20MB recommended)
- **Ensure latest deployment** is live

### "Model not available" error
- **GPT-4 Vision**: Verify OpenAI API key has access to gpt-4o
- **BLIP**: Check Hugging Face API key is valid
- **Google Vision**: Ensure Cloud Vision API is enabled in Google Cloud Console

---

## Advanced Configuration

### Task-Specific Vision Models

In `/api/vision/analyze-enhanced`, you can specify `taskType`:

```typescript
{
  imageUrl: "https://...",
  taskType: "design-critique",  // 'general' | 'design-critique' | 'ocr' | 'art-style'
  useMultipleModels: true,       // Use multiple models for comprehensive analysis
  prompt: "Focus on color theory and composition"
}
```

### Disable Vision Processing

If you want to disable auto-vision for uploaded images, modify `/app/api/upload/route.ts`:

```typescript
// Comment out the vision processing section
// const analysis = await vision.analyzeImage(result.url, {...});
```

---

## Next Steps

- ✅ Vision system is integrated and ready
- 🔄 Add your API key(s) to Vercel
- 🚀 Redeploy and test with an image upload
- 🎨 Customize vision prompts for your workflow

For questions or issues, check the codebase or reach out!
