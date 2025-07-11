# 🚀 Deployment Guide for Netflix Code Bot

## **Overview**
This guide covers deploying your Netflix Code Bot to various platforms. The bot requires:
- Node.js 16+
- Puppeteer (browser automation)
- WhatsApp Web integration
- Email IMAP access

## **📋 Pre-Deployment Checklist**

### **Environment Variables Required**
Create a `.env` file with:
```bash
# Email Configuration
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SENDER_FILTER=netflix@netflix.com
EMAIL_SUBJECT_FILTER=temporary access,verification

# WhatsApp Configuration
WHATSAPP_RECIPIENT_ID=1234567890@c.us

# Server Configuration
PORT=3000
NODE_ENV=production
```

### **Security Considerations**
- ✅ Use app passwords for Gmail (not regular passwords)
- ✅ Enable 2FA on your email account
- ✅ Use environment variables (never commit .env to git)
- ✅ Set up proper firewall rules
- ✅ Use HTTPS in production

## **🌐 Platform-Specific Deployment**

### **1. Render (Recommended - Free Tier)**

#### **Step 1: Prepare Repository**
```bash
# Ensure your code is in a Git repository
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### **Step 2: Deploy to Render**
1. **Go to [render.com](https://render.com)**
2. **Connect your GitHub repository**
3. **Create a new Web Service**
4. **Configure settings:**
   - **Name**: `netflix-code-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

#### **Step 3: Set Environment Variables**
In Render dashboard, add these environment variables:
```bash
NODE_ENV=production
PORT=10000
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SENDER_FILTER=netflix@netflix.com
EMAIL_SUBJECT_FILTER=temporary access,verification
WHATSAPP_RECIPIENT_ID=1234567890@c.us
```

#### **Step 4: Deploy**
- Click **"Create Web Service"**
- Render will automatically deploy your app
- Your app will be available at: `https://your-app-name.onrender.com`

### **2. Railway**

#### **Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
```

#### **Step 2: Deploy**
```bash
# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set EMAIL_HOST=imap.gmail.com
railway variables set EMAIL_USER=your-email@gmail.com
railway variables set EMAIL_PASSWORD=your-app-password
railway variables set EMAIL_SENDER_FILTER=netflix@netflix.com
railway variables set WHATSAPP_RECIPIENT_ID=1234567890@c.us

# Deploy
railway up
```

### **3. Vercel**

#### **Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

#### **Step 2: Deploy**
```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**Note**: Vercel has limitations with Puppeteer and long-running processes. Consider using Render or Railway instead.

### **4. Docker Deployment**

#### **Step 1: Build Docker Image**
```bash
# Build the image
docker build -t netflix-code-bot .

# Test locally
docker run -p 3000:3000 --env-file .env netflix-code-bot
```

#### **Step 2: Deploy to Cloud Platforms**

**Google Cloud Run:**
```bash
# Tag for Google Container Registry
docker tag netflix-code-bot gcr.io/YOUR_PROJECT/netflix-code-bot

# Push to registry
docker push gcr.io/YOUR_PROJECT/netflix-code-bot

# Deploy to Cloud Run
gcloud run deploy netflix-code-bot \
  --image gcr.io/YOUR_PROJECT/netflix-code-bot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

**AWS ECS:**
```bash
# Create ECR repository
aws ecr create-repository --repository-name netflix-code-bot

# Tag and push
docker tag netflix-code-bot:latest YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/netflix-code-bot:latest
docker push YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/netflix-code-bot:latest
```

### **5. DigitalOcean App Platform**

#### **Step 1: Prepare for Deployment**
1. **Push code to GitHub**
2. **Go to DigitalOcean App Platform**
3. **Create new app from GitHub repository**

#### **Step 2: Configure App**
- **Source**: Your GitHub repository
- **Branch**: `main`
- **Build Command**: `npm install`
- **Run Command**: `npm start`
- **Environment**: `Node.js`

#### **Step 3: Set Environment Variables**
Add all required environment variables in the DigitalOcean dashboard.

## **🔧 Post-Deployment Setup**

### **1. WhatsApp QR Code Scanning**
1. **Access your deployed app**: `https://your-app-url.com`
2. **Scan the QR code** with WhatsApp
3. **Verify connection** shows "Connected to WhatsApp"

### **2. Test Email Integration**
1. **Send a test email** with Netflix verification link
2. **Use the API**: `GET /fetch-latest-code`
3. **Verify code extraction** works

### **3. Monitor Application**
```bash
# Check health endpoint
curl https://your-app-url.com/health

# Check WhatsApp status
curl https://your-app-url.com/status

# Test code fetching
curl https://your-app-url.com/fetch-latest-code
```

## **📊 Monitoring and Maintenance**

### **Health Checks**
Your app includes health endpoints:
- `/health` - Basic health check
- `/status` - WhatsApp connection status
- `/whatsapp-status` - Detailed WhatsApp status

### **Logs and Debugging**
```bash
# View application logs
railway logs  # (Railway)
render logs   # (Render)
docker logs container-name  # (Docker)
```

### **Common Issues and Solutions**

#### **Puppeteer Issues**
```bash
# If Puppeteer fails to launch
# Add these environment variables:
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

#### **WhatsApp Connection Issues**
- **QR Code expires**: Rescan the QR code
- **Session lost**: Clear WhatsApp Web sessions and rescan
- **Connection timeout**: Check network connectivity

#### **Email Connection Issues**
- **IMAP blocked**: Enable "Less secure app access" or use app passwords
- **Authentication failed**: Check email credentials
- **No emails found**: Verify sender filter and subject filter

## **🔒 Security Best Practices**

### **Environment Variables**
- ✅ Never commit `.env` files to Git
- ✅ Use platform-specific secret management
- ✅ Rotate passwords regularly
- ✅ Use app-specific passwords for Gmail

### **Network Security**
- ✅ Use HTTPS in production
- ✅ Set up proper firewall rules
- ✅ Limit access to admin endpoints
- ✅ Monitor for suspicious activity

### **Application Security**
- ✅ Keep dependencies updated
- ✅ Use non-root user in Docker
- ✅ Implement rate limiting
- ✅ Add request validation

## **📈 Scaling Considerations**

### **Free Tier Limitations**
- **Render**: 750 hours/month, sleeps after 15 minutes
- **Railway**: Limited bandwidth and compute
- **Vercel**: Function timeout limits

### **Paid Tier Benefits**
- **Always-on servers**
- **Better performance**
- **More resources**
- **Custom domains**

### **Scaling Strategies**
1. **Upgrade to paid plans** for always-on service
2. **Use multiple instances** for redundancy
3. **Implement caching** for better performance
4. **Add monitoring** and alerting

## **🔄 Continuous Deployment**

### **GitHub Actions**
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Render
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v1.0.0
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}
```

## **📞 Support and Troubleshooting**

### **Getting Help**
1. **Check logs** for error messages
2. **Test endpoints** individually
3. **Verify environment variables**
4. **Check platform status pages**

### **Useful Commands**
```bash
# Test local deployment
npm start

# Test with Docker
docker-compose up

# Check dependencies
npm audit

# Update dependencies
npm update
```

---

## **🎯 Quick Deployment Checklist**

- [ ] Environment variables configured
- [ ] Code pushed to Git repository
- [ ] Platform account created
- [ ] Deployment completed
- [ ] WhatsApp QR code scanned
- [ ] Email integration tested
- [ ] Health checks passing
- [ ] Monitoring set up

**Happy Deploying! 🚀** 