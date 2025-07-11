# 🚀 Railway Deployment Guide

## Quick Deploy to Railway

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Initialize Project
```bash
railway init
```

### 4. Set Environment Variables
```bash
# Email Configuration
railway variables set EMAIL_HOST=imap.gmail.com
railway variables set EMAIL_PORT=993
railway variables set EMAIL_USER=your-email@gmail.com
railway variables set EMAIL_PASSWORD=your-app-password
railway variables set EMAIL_SENDER_FILTER=netflix@netflix.com
railway variables set EMAIL_SUBJECT_FILTER=temporary access,verification

# WhatsApp Configuration
railway variables set WHATSAPP_RECIPIENT_ID=1234567890@c.us


# Netflix Auth (Optional)
railway variables set NETFLIX_EMAIL=your-netflix-email@example.com
railway variables set NETFLIX_PASSWORD=your-netflix-password
```

### 5. Deploy
```bash
railway up
```

### 6. Get Your URL
```bash
railway domain
```

## Environment Variables Required

Copy from `env.example` and set in Railway dashboard:

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


# Netflix Authentication (Optional)
NETFLIX_EMAIL=your-netflix-email@example.com
NETFLIX_PASSWORD=your-netflix-password

# Server Configuration
PORT=3000
NODE_ENV=production
```

> **Note:** Puppeteer uses its own bundled Chromium on Railway. You do not need to set `PUPPETEER_EXECUTABLE_PATH` or `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`.

## After Deployment

1. **Visit your Railway URL**
2. **Scan WhatsApp QR code**
3. **Test the bot**: Click "Auto Fetch & Send"
4. **Monitor logs**: `railway logs`

## Commands

```bash
# View logs
railway logs

# Check status
railway status

# Update variables
railway variables set VARIABLE_NAME=value

# Redeploy
railway up
```

## Troubleshooting

- **WhatsApp QR Code**: Scan the QR code on your Railway URL
- **Email Issues**: Check your Gmail app password
- **Puppeteer Issues**: No extra config needed on Railway
- **Auto-Scheduler**: Enable with `AUTO_SCHEDULER_ENABLED=true`

Happy deploying! 🎉 