# Deployment Guide

## GitHub Deployment

### Initial Setup

1. **Ensure .env is protected**
   - The `.gitignore` file already excludes `.env` files
   - Never commit your actual API key to the repository
   - Use `.env.example` as a template for others

2. **Update your local .env file**
   ```bash
   # Rename the variable in your .env file
   VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

3. **Initialize Git Repository** (if not already done)
   ```bash
   git init
   git add .
   git commit -m "Initial commit: AI-Powered CLTV & RFM Analysis Dashboard"
   ```

4. **Add GitHub Remote**
   ```bash
   git remote add origin https://github.com/linkmodo/AI_MBA_CLTV_RFM_Analysis.git
   git branch -M main
   git push -u origin main
   ```

## Deployment Options

### Option 1: Netlify (Recommended)

1. **Install Netlify CLI** (optional)
   ```bash
   npm install -g netlify-cli
   ```

2. **Build the project**
   ```bash
   npm run build
   ```

3. **Deploy via Netlify Dashboard**
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Add environment variable:
     - Key: `VITE_GEMINI_API_KEY`
     - Value: Your Gemini API key

4. **Deploy via CLI** (alternative)
   ```bash
   netlify deploy --prod
   ```

### Option 2: Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Add Environment Variable**
   - Go to your project settings on Vercel dashboard
   - Navigate to "Environment Variables"
   - Add: `VITE_GEMINI_API_KEY` with your API key

### Option 3: GitHub Pages (Static Hosting)

1. **Update vite.config.ts** for GitHub Pages
   ```typescript
   export default defineConfig({
     base: '/AI_MBA_CLTV_RFM_Analysis/',
     // ... rest of config
   })
   ```

2. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Add deploy script to package.json**
   ```json
   {
     "scripts": {
       "deploy": "npm run build && gh-pages -d dist"
     }
   }
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

   **Note**: GitHub Pages doesn't support server-side environment variables. You'll need to use a different approach for API keys (not recommended for production).

## Environment Variables

### Development
Create a `.env` file in the root directory:
```env
VITE_GEMINI_API_KEY=your_development_api_key
```

### Production
Set environment variables in your hosting platform:
- **Netlify**: Site settings → Environment variables
- **Vercel**: Project settings → Environment Variables
- **Other platforms**: Consult their documentation

## Security Best Practices

✅ **DO:**
- Keep `.env` in `.gitignore`
- Use `.env.example` for documentation
- Set environment variables in hosting platform
- Rotate API keys regularly
- Use different keys for development and production

❌ **DON'T:**
- Commit `.env` files to Git
- Hardcode API keys in source code
- Share API keys in public repositories
- Use production keys in development

## Troubleshooting

### API Key Not Working
1. Ensure the variable name is exactly `VITE_GEMINI_API_KEY`
2. Restart the dev server after changing `.env`
3. Check browser console for error messages
4. Verify API key is valid at [Google AI Studio](https://aistudio.google.com/app/apikey)

### Build Failures
1. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
2. Clear build cache: `rm -rf dist`
3. Check for TypeScript errors: `npm run build`

### Environment Variables Not Loading
1. Ensure variable starts with `VITE_` prefix
2. Restart development server
3. Check `vite-env.d.ts` includes the variable type definition

## Monitoring

After deployment, monitor:
- API usage at [Google AI Studio](https://aistudio.google.com/)
- Application errors in browser console
- Build logs in hosting platform dashboard

## Updates

To update the deployed application:
```bash
git add .
git commit -m "Description of changes"
git push origin main
```

Your hosting platform will automatically rebuild and redeploy (if auto-deploy is enabled).
