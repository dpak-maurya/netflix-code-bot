#!/bin/bash

set -e

echo "🚀 Netflix Code Bot - Railway Deployment"
echo "========================================"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please login to Railway..."
    railway login
fi

echo "📦 Initializing Railway project..."
railway init

if [ -f .env ]; then
    echo "🔑 Found .env file. Importing all variables to Railway..."
    railway variables import .env
else
    echo "⚠️  .env file not found. Falling back to manual prompts."
    read -p "Gmail address: " email_user
    read -s -p "Gmail app password: " email_password
    echo ""
    read -p "WhatsApp recipient ID (e.g., 1234567890@c.us): " whatsapp_id
    read -p "Email sender filter (default: netflix@netflix.com): " sender_filter
    sender_filter=${sender_filter:-netflix@netflix.com}
    read -p "Email subject filter (default: temporary access,verification): " subject_filter
    subject_filter=${subject_filter:-temporary access,verification}

    echo "⚙️ Setting environment variables..."
    railway variables set EMAIL_HOST imap.gmail.com
    railway variables set EMAIL_PORT 993
    railway variables set EMAIL_USER "$email_user"
    railway variables set EMAIL_PASSWORD "$email_password"
    railway variables set EMAIL_SENDER_FILTER "$sender_filter"
    railway variables set EMAIL_SUBJECT_FILTER "$subject_filter"
    railway variables set WHATSAPP_RECIPIENT_ID "$whatsapp_id"
    railway variables set NODE_ENV production
fi

echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "🌐 Your Railway URL:"
railway domain

echo ""
echo "📱 Next steps:"
echo "1. Visit your Railway URL"
echo "2. Scan the WhatsApp QR code"
echo "3. Test the bot by clicking 'Auto Fetch & Send'"
echo ""
echo "📊 Monitor your deployment:"
echo "   railway logs"
echo "   railway status" 