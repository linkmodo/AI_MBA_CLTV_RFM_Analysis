# Serverless Function Setup Guide

## 🔐 Secure API Key Architecture

This application now uses **Netlify Serverless Functions** to keep your Gemini API key completely secure. The key **never reaches the browser** - it only exists on the server side.

## 🏗️ Architecture Overview

```
Browser (Client)
    ↓
    | HTTP POST Request with prompt
    ↓
Netlify Serverless Function (/.netlify/functions/gemini-proxy)
    ↓
    | Uses server-side GEMINI_API_KEY
    ↓
Google Gemini API
    ↓
    | Returns AI response
    ↓
Browser receives response (API key never exposed)
```

## 📁 Project Structure

```
├── netlify/
│   └── functions/
│       └── gemini-proxy.ts     # Serverless function (server-side)
├── services/
│   └── geminiService.ts        # Client calls serverless function
├── .env                        # Local environment variables (gitignored)
├── .env.example                # Template for environment variables
└── netlify.toml                # Netlify configuration
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install `@netlify/functions` for TypeScript support.

### 2. Local Development Setup

#### Option A: Using Netlify CLI (Recommended)

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

3. **Add your API key to `.env`:**
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

4. **Run with Netlify Dev:**
   ```bash
   netlify dev
   ```

   This will:
   - Start Vite dev server on port 3000
   - Start Netlify Functions on port 8888
   - Automatically load environment variables from `.env`

5. **Access the app:**
   - Open: `http://localhost:8888`
   - Functions available at: `http://localhost:8888/.netlify/functions/gemini-proxy`

#### Option B: Using Vite Dev Server (Limited)

If you just want to run the frontend without serverless functions:

```bash
npm run dev
```

**Note:** AI features won't work without the serverless function running.

### 3. Production Deployment (Netlify)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Implement serverless function for secure API key handling"
   git push origin main
   ```

2. **Deploy to Netlify:**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Import your GitHub repository
   - Configure build settings (auto-detected from `netlify.toml`)

3. **Set Environment Variable:**
   - Go to: **Site settings** → **Environment variables**
   - Add variable:
     - **Key:** `GEMINI_API_KEY` (NOT `VITE_GEMINI_API_KEY`)
     - **Value:** Your actual Gemini API key
     - **Scopes:** Check "Same value for all deploy contexts"

4. **Deploy:**
   - Netlify will automatically build and deploy
   - Functions will be available at: `https://your-site.netlify.app/.netlify/functions/gemini-proxy`

## 🔧 How It Works

### Client-Side (`services/geminiService.ts`)

```typescript
export const getAiAnalysis = async (prompt: string): Promise<string> => {
    // Calls serverless function instead of Gemini API directly
    const response = await fetch('/.netlify/functions/gemini-proxy', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
    });
    
    const data = await response.json();
    return data.text;
};
```

### Server-Side (`netlify/functions/gemini-proxy.ts`)

```typescript
export const handler = async (event) => {
    // API key is only accessible on server
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Call Gemini API from server
    const response = await fetch(`https://...?key=${apiKey}`, {
        // ... Gemini API call
    });
    
    // Return only the response text to client
    return { statusCode: 200, body: JSON.stringify({ text }) };
};
```

## 🔒 Security Benefits

### Before (Client-Side API Key):
❌ API key bundled in JavaScript  
❌ Visible in browser DevTools  
❌ Extractable from source code  
❌ Netlify scanner flags as exposed secret  

### After (Serverless Function):
✅ API key only on server  
✅ Never sent to browser  
✅ Not in JavaScript bundle  
✅ No Netlify security warnings  
✅ Can't be extracted by users  

## 🧪 Testing

### Test Serverless Function Locally

```bash
# Start Netlify Dev
netlify dev

# In another terminal, test the function
curl -X POST http://localhost:8888/.netlify/functions/gemini-proxy \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello"}'
```

Expected response:
```json
{
  "text": "Hello! How can I help you today?"
}
```

### Test in the Application

1. Start the app: `netlify dev`
2. Upload a CSV file
3. Click "Suggest with AI" in the cleaning step
4. Check browser console - should see no API key

## 🐛 Troubleshooting

### "API key not configured" Error

**Cause:** Environment variable not set  
**Fix:** 
- Local: Add `GEMINI_API_KEY` to `.env` file
- Netlify: Add in Site settings → Environment variables

### Function Not Found (404)

**Cause:** Netlify Dev not running or wrong URL  
**Fix:**
- Use `netlify dev` instead of `npm run dev`
- Check function URL: `http://localhost:8888/.netlify/functions/gemini-proxy`

### CORS Errors

**Cause:** Function not allowing requests from your domain  
**Fix:** Update CORS headers in `gemini-proxy.ts`:
```typescript
headers: {
  'Access-Control-Allow-Origin': 'https://your-domain.netlify.app',
}
```

### TypeScript Errors

**Cause:** `@netlify/functions` not installed  
**Fix:**
```bash
npm install
```

## 📊 Monitoring

### Check Function Logs (Netlify)

1. Go to Netlify Dashboard
2. Select your site
3. Navigate to **Functions** tab
4. Click on `gemini-proxy`
5. View real-time logs

### Monitor API Usage (Google)

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Check API usage dashboard
3. Set up usage alerts

## 🔄 Migration from Client-Side

If you're migrating from the old client-side approach:

1. **Update `.env` file:**
   ```diff
   - VITE_GEMINI_API_KEY=your_key
   + GEMINI_API_KEY=your_key
   ```

2. **Update Netlify environment variables:**
   - Remove: `VITE_GEMINI_API_KEY`
   - Add: `GEMINI_API_KEY`

3. **Clear build cache:**
   ```bash
   rm -rf dist node_modules
   npm install
   ```

4. **Redeploy:**
   ```bash
   git push origin main
   ```

## 📚 Additional Resources

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Netlify Dev CLI](https://docs.netlify.com/cli/get-started/)
- [Google Gemini API](https://ai.google.dev/docs)

## ✅ Checklist

Before deploying:

- [ ] `.env` file created with `GEMINI_API_KEY`
- [ ] Tested locally with `netlify dev`
- [ ] AI features working in local development
- [ ] `GEMINI_API_KEY` set in Netlify dashboard
- [ ] Deployed and tested in production
- [ ] Verified API key not in browser DevTools
- [ ] Checked Netlify function logs for errors

---

**Security Status:** 🔒 **SECURE** - API key never exposed to browser
