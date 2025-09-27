# Railway Deployment Guide for PP Self-Hosted Backend

## 🚀 Quick Deploy to Railway

### Prerequisites
- Railway account (sign up at [railway.app](https://railway.app))
- GitHub repository with your code
- Railway CLI (optional but recommended)

### Method 1: Deploy via Railway Dashboard (Recommended)

1. **Connect GitHub Repository**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `pp-self-hosted` repository
   - Select the `backend` folder as the root directory

2. **Configure Environment Variables**
   In Railway dashboard, go to Variables tab and add:
   ```
   PORT=3001
   NODE_ENV=production
   SAFEVISION_ENABLED=true
   SAFEVISION_TIMEOUT=60000
   MAX_FILE_SIZE=52428800
   HELMET_ENABLED=true
   LOG_LEVEL=info
   HEALTH_CHECK_ENABLED=true
   ```

3. **Deploy**
   - Railway will automatically detect the Node.js app
   - It will run `npm install` and `npm run build` (via postinstall script)
   - The app will start with `npm start`

### Method 2: Deploy via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   cd backend
   railway init
   ```

4. **Set Environment Variables**
   ```bash
   railway variables set PORT=3001
   railway variables set NODE_ENV=production
   railway variables set SAFEVISION_ENABLED=true
   ```

5. **Deploy**
   ```bash
   railway up
   ```

## 🔧 Configuration Files

The backend includes these Railway-specific files:

- **`railway.json`**: Railway deployment configuration
- **`Procfile`**: Process definition for Railway
- **`railway.env`**: Environment variables template

Railway will automatically detect Node.js and handle the build process.

## 📋 Environment Variables

### Required Variables
- `PORT`: Server port (Railway sets this automatically)
- `NODE_ENV`: Environment mode (`production`)

### Optional Variables
- `SAFEVISION_ENABLED`: Enable SafeVision processing (`true`)
- `SAFEVISION_TIMEOUT`: Processing timeout in ms (`60000`)
- `MAX_FILE_SIZE`: Max upload size in bytes (`52428800`)
- `HELMET_ENABLED`: Enable security headers (`true`)
- `LOG_LEVEL`: Logging level (`info`)

## 🏥 Health Checks

Railway will automatically monitor these endpoints:
- **Root**: `GET /` - Basic API info
- **Health**: `GET /api/health` - Detailed health status

## 📁 File Structure for Railway

```
backend/
├── src/                    # TypeScript source code
├── dist/                   # Compiled JavaScript (auto-generated)
├── uploads/                # Temporary upload directory
├── outputs/                # Processed images
├── temp/                   # Temporary files
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── railway.json            # Railway deployment config
├── Procfile               # Process definition
└── railway.env            # Environment variables template
```

## 🚨 Important Notes

### SafeVision Integration
- The backend expects SafeVision Python scripts to be available
- For Railway deployment, you may need to:
  1. Include SafeVision files in the backend directory
  2. Install Python dependencies via nixpacks.toml
  3. Set up Python environment variables

### File Storage
- Railway provides ephemeral file storage
- Uploaded files are temporary and will be cleaned up
- Consider using external storage (S3, etc.) for production

### Memory Limits
- Railway has memory limits based on your plan
- Large image processing may require higher memory limits
- Monitor usage in Railway dashboard

## 🔍 Troubleshooting

### Build Failures
1. Check Railway build logs
2. Ensure all dependencies are in `package.json`
3. Verify TypeScript compilation works locally

### Runtime Errors
1. Check Railway deployment logs
2. Verify environment variables are set
3. Test health endpoint: `https://your-app.railway.app/api/health`

### SafeVision Issues
1. Ensure Python is available in Railway environment
2. Check SafeVision script paths
3. Verify Python dependencies are installed

## 📊 Monitoring

Railway provides:
- Real-time logs
- Performance metrics
- Error tracking
- Resource usage monitoring

## 🔄 Updates

To update your deployment:
1. Push changes to your GitHub repository
2. Railway will automatically redeploy
3. Or use `railway up` for manual deployment

## 🌐 Custom Domain

1. Go to Railway dashboard
2. Select your project
3. Go to Settings > Domains
4. Add your custom domain
5. Update DNS records as instructed

## 💰 Pricing

Railway offers:
- Free tier with limited resources
- Usage-based pricing for production
- Check [Railway Pricing](https://railway.app/pricing) for details

---

**Need Help?**
- Check Railway documentation: [docs.railway.app](https://docs.railway.app)
- Join Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Review build logs in Railway dashboard
