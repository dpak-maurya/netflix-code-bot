# 🤖 Netflix Code Bot

Automatically fetch Netflix temporary access codes from emails and send them to WhatsApp.

## 🚀 Quick Deploy to Railway

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Deploy
```bash
# Login and initialize
railway login
railway init

# Set environment variables
railway variables set EMAIL_HOST=imap.gmail.com
railway variables set EMAIL_PORT=993
railway variables set EMAIL_USER=your-email@gmail.com
railway variables set EMAIL_PASSWORD=your-app-password
railway variables set EMAIL_SENDER_FILTER=netflix@netflix.com
railway variables set EMAIL_SUBJECT_FILTER=temporary access,verification
railway variables set WHATSAPP_RECIPIENT_ID=1234567890@c.us

# Deploy
railway up
```

### 3. Setup
1. **Visit your Railway URL**
2. **Scan WhatsApp QR code**
3. **Test**: Click "Auto Fetch & Send"

## 🔧 Features

- ✅ **Email Integration**: IMAP support for Gmail, Outlook, etc.
- ✅ **Code Extraction**: Multiple methods (email content, verification links)
- ✅ **WhatsApp Integration**: Automatic sending to groups/contacts
- ✅ **Auto-Scheduler**: Check for new codes every X minutes
- ✅ **Netflix Authentication**: Optional login for verification links
- ✅ **Web Interface**: Easy-to-use dashboard

## 📋 Requirements

- **Node.js 16+**
- **Gmail account** with app password
- **WhatsApp** for bot connection
- **Railway account** (free tier available)

## 🔑 Environment Variables

Copy from `env.example` and set in Railway:

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

# Auto-Scheduler (Optional)
AUTO_SCHEDULER_ENABLED=false
AUTO_CHECK_INTERVAL=30

# Netflix Auth (Optional)
NETFLIX_EMAIL=your-netflix-email@example.com
NETFLIX_PASSWORD=your-netflix-password
```

## 🎯 Usage

### Web Interface
- **Get Latest Code**: Fetch and display code
- **Auto Fetch & Send**: One-click fetch and send to WhatsApp
- **Send to WhatsApp**: Manual send if code is already fetched

### API Endpoints
```bash
# Fetch latest code
GET /fetch-latest-code

# Auto fetch and send
GET /auto-fetch-and-send

# Check status
GET /status

# Health check
GET /health
```

### Auto-Scheduler
```bash
# Start scheduler
POST /scheduler/start

# Stop scheduler
POST /scheduler/stop

# Check status
GET /scheduler/status
```

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp env.example .env

# Edit .env with your settings

# Start development server
npm run dev
```

## 📊 Railway Pricing

- **Free Tier**: 500 hours/month
- **Your Usage**: ~720 hours/month (always-on)
- **Cost**: $5/month for always-on service
- **Alternative**: Free tier with manual restarts

## 🔍 Troubleshooting

### WhatsApp Issues
- **QR Code**: Scan the QR code on your Railway URL
- **Connection**: Wait for "Connected to WhatsApp" status
- **Session**: Clear WhatsApp Web sessions if needed

### Email Issues
- **App Password**: Use Gmail app password, not regular password
- **2FA**: Enable 2-factor authentication on Gmail
- **Filters**: Check EMAIL_SENDER_FILTER and EMAIL_SUBJECT_FILTER

### Deployment Issues
- **Logs**: `railway logs`
- **Status**: `railway status`
- **Variables**: Check all environment variables are set

## 📝 License

MIT License - see LICENSE file for details.

---

**Deploy to Railway and start sharing Netflix codes automatically!** 🚀 