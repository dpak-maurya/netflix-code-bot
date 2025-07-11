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

# Set environment variables (copy from env.example)
railway variables import .env

# Deploy
railway up
```

### 3. Setup
1. **Visit your Railway URL**
2. **Scan WhatsApp QR code**
3. **Test**: Click "Get Latest Code" or type "code" in your WhatsApp group

## 🔧 Features

- ✅ **Email Integration**: IMAP support for Gmail, Outlook, etc.
- ✅ **Code Extraction**: Multiple methods (email content, verification links)
- ✅ **WhatsApp Integration**: Automatic sending to groups/contacts
- ✅ **Web Interface**: Easy-to-use dashboard
- ✅ **Group Listening**: Type "code" in your WhatsApp group to get the latest code

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

# Netflix Auth (Optional)
NETFLIX_EMAIL=your-netflix-email@example.com
NETFLIX_PASSWORD=your-netflix-password

# Server Configuration
PORT=3000
NODE_ENV=production
```

## 🎯 Usage

### Web Interface
- **Get Latest Code**: Fetch and display code
- **Send to WhatsApp**: Manual send if code is already fetched

### WhatsApp Group
- **Type "code"** in your configured group to get the latest Netflix code as a reply from the bot

### API Endpoints
```bash
# Fetch latest code
GET /fetch-latest-code

# Send code to WhatsApp
POST /send-to-whatsapp

# Check status
GET /status

# Health check
GET /health
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