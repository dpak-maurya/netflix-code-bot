# 🚀 Deploy Netflix Code Bot to Render

This guide will help you deploy your Netflix Code Bot to Render so it's accessible from any device.

## 📋 Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **Gmail Account** - For email access
4. **WhatsApp** - For the bot connection

## 🔧 Step 1: Prepare Your Environment Variables

Create a `.env` file locally with these variables:

```env
# Email Configuration
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SENDER_FILTER=netflix@netflix.com
EMAIL_SUBJECT_FILTER=Your Netflix temporary access code

# WhatsApp Configuration
WHATSAPP_RECIPIENT_ID=1234567890@c.us

# Server Configuration
PORT=10000
NODE_ENV=production
```

### 🔑 Getting Gmail App Password

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification**
3. Go to **App passwords**
4. Generate a new app password for "Mail"
5. Use this password in `EMAIL_PASSWORD`

### 📱 Getting WhatsApp Group/Contact ID

1. Run the bot locally first
2. Visit `http://localhost:3000/list-groups`
3. Copy the ID of your target group/contact
4. Use this ID in `WHATSAPP_RECIPIENT_ID`

## 🌐 Step 2: Deploy to Render

### Option A: Deploy via Render Dashboard

1. **Sign in to Render**
   - Go to [render.com](https://render.com)
   - Sign up/Sign in with your GitHub account

2. **Create New Web Service**
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository
   - Select the repository containing your bot

3. **Configure the Service**
   - **Name**: `netflix-code-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node main.js`
   - **Plan**: `Free`

4. **Add Environment Variables**
   - Click **"Environment"** tab
   - Add all variables from your `.env` file:
     - `EMAIL_HOST`
     - `EMAIL_PORT`
     - `EMAIL_USER`
     - `EMAIL_PASSWORD`
     - `EMAIL_SENDER_FILTER`
     - `EMAIL_SUBJECT_FILTER`
     - `WHATSAPP_RECIPIENT_ID`
     - `NODE_ENV=production`

5. **Deploy**
   - Click **"Create Web Service"**
   - Wait for deployment to complete

### Option B: Deploy via render.yaml (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```

2. **Deploy on Render**
   - Go to [render.com](https://render.com)
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`
   - Add your environment variables in the dashboard
   - Deploy

## 🔗 Step 3: Access Your Bot

1. **Get Your URL**
   - After deployment, Render will give you a URL like:
   - `https://netflix-code-bot.onrender.com`

2. **Scan QR Code**
   - Visit your bot URL
   - Scan the QR code with WhatsApp
   - This only needs to be done once!

3. **Share with Friends**
   - Share the URL with your friends
   - They can access it from any device
   - No additional QR scans needed

## 📱 Step 4: Test Your Bot

1. **Test Email Fetching**
   - Click "Get Latest Code" button
   - Should fetch the latest Netflix code

2. **Test WhatsApp Sending**
   - Fetch a code first
   - Click "Send to WhatsApp"
   - Should send to your configured group/contact

## 🔧 Troubleshooting

### Common Issues:

1. **"No QR code available"**
   - Wait a few minutes for WhatsApp to generate QR
   - Check server logs in Render dashboard

2. **"Email authentication failed"**
   - Verify your Gmail app password
   - Enable 2-factor authentication
   - Check email credentials

3. **"WhatsApp not ready"**
   - Scan the QR code first
   - Wait for connection to establish
   - Check if session expired

4. **"No matching email found"**
   - Verify `EMAIL_SENDER_FILTER` and `EMAIL_SUBJECT_FILTER`
   - Check if emails exist in the specified time range
   - Test with a recent Netflix email

### Viewing Logs:
- Go to your Render service dashboard
- Click **"Logs"** tab
- Check for error messages

## 🎉 Success!

Your Netflix Code Bot is now:
- ✅ **Always online** - No need to keep your computer running
- ✅ **Accessible from anywhere** - Any device can use it
- ✅ **One-time setup** - Single QR scan for everyone
- ✅ **Free hosting** - Render free tier is sufficient

## 🔄 Updates

To update your bot:
1. Push changes to GitHub
2. Render will automatically redeploy
3. No need to rescan QR code

## 📞 Support

If you encounter issues:
1. Check the logs in Render dashboard
2. Verify your environment variables
3. Test locally first to isolate issues

---

**Happy Netflix code sharing! 🎬📱** 