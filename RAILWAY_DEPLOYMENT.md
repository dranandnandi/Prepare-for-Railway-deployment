# Railway Deployment Guide for WhatsApp LIMS Integration

## Prerequisites
1. Git repository (GitHub, GitLab, or Bitbucket)
2. Railway account (https://railway.app)

## Deployment Steps

### Option 1: Single Railway Service (Recommended)
This deploys both frontend and backend together as one service.

1. **Push your code to Git**
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin master
   ```
   ✅ **COMPLETED** - Your code is now at: https://github.com/dranandnandi/Prepare-for-Railway-deployment

2. **Deploy to Railway**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically detect it's a Node.js project

3. **Configure Environment Variables**
   In Railway dashboard > Variables tab, add:
   ```
   NODE_ENV=production
   PORT=3001
   ```

4. **Railway will automatically:**
   - Run `npm install`
   - Run `npm run build` (builds React frontend)
   - Run `npm start` (starts Express server)
   - Provide a public URL

   ✅ **DEPLOYMENT SUCCESSFUL!** 
   - Your app is live at: https://prepare-for-railway-deployment-production.up.railway.app
   - Health check: https://prepare-for-railway-deployment-production.up.railway.app/health
   - API status: https://prepare-for-railway-deployment-production.up.railway.app/api/status

### Option 2: Separate Frontend and Backend Services

#### Backend Service:
1. Create a new Railway service for backend
2. Connect your repository
3. Set root directory to `/server` (if you separate the code)
4. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3001
   ```

#### Frontend Service:
1. Create another Railway service for frontend
2. Connect the same repository  
3. Set build command: `npm run build`
4. Set start command: `npm run preview`
5. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-service.railway.app
   ```

## Important Notes

### WhatsApp Web.js Considerations
- **Persistent Sessions**: Railway provides persistent storage, but WhatsApp sessions may timeout
- **QR Code Generation**: Works on Railway since it supports Puppeteer
- **Browser Dependencies**: Railway's Nixpacks handles Chrome/Chromium dependencies automatically

### File Uploads
- Railway provides 1GB ephemeral storage per service
- For permanent file storage, consider integrating with:
  - AWS S3
  - Cloudinary
  - Railway PostgreSQL for metadata

### Environment Variables You May Need
```
NODE_ENV=production
PORT=3001
WHATSAPP_SESSION_PATH=/tmp/whatsapp-session
```

### Production Optimizations

1. **Add health check endpoint** in server/index.js:
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

2. **Add proper error handling** for production:
```javascript
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

## Domain Setup (Optional)
1. In Railway dashboard, go to Settings > Domains
2. Add your custom domain
3. Railway provides SSL certificates automatically

## Monitoring
- Use Railway's built-in logs and metrics
- Monitor WhatsApp connection status
- Set up alerts for service downtime

## Cost Estimation
- Railway Starter Plan: $5/month
- Usage-based pricing for compute and bandwidth
- Estimated cost for this app: $5-15/month depending on usage

Your app will be accessible at: `https://your-app-name.railway.app`
