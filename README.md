# Netflix Code Bot 🤖

A WhatsApp bot that automatically fetches Netflix temporary access codes from emails and sends them to a WhatsApp group or contact.

## Features ✨

- 📧 **Email Monitoring**: Automatically checks for Netflix emails
- 🤖 **WhatsApp Integration**: Sends codes directly to WhatsApp
- 🌐 **Web Interface**: Beautiful UI for manual code fetching
- 📱 **QR Code Support**: Scan WhatsApp QR code directly in browser
- 🔍 **Smart Code Extraction**: Extracts codes or verification links
- ⚙️ **Configurable**: Customizable email filters and time ranges
- 🚀 **Production Ready**: Environment-based logging and error handling

## Screenshots 📸

![Netflix Code Bot Interface](https://via.placeholder.com/800x400/667eea/ffffff?text=Netflix+Code+Bot+Interface)

## Quick Start 🚀

### Prerequisites

- Node.js 16+ 
- Gmail account with App Password
- WhatsApp account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/netflix-code-bot.git
   cd netflix-code-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the bot**
   ```bash
   npm run dev  # Development mode
   npm start    # Production mode
   ```

5. **Open the web interface**
   - Go to `http://localhost:3000`
   - Scan the QR code with WhatsApp
   - Start fetching Netflix codes!

## Configuration ⚙️

### Environment Variables

Create a `.env` file with the following variables:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SENDER_FILTER=info@account.netflix.com
EMAIL_SUBJECT_FILTER=code,temporary access

# WhatsApp Configuration
WHATSAPP_RECIPIENT_ID=919161452323-1602685575@g.us

# Server Configuration (optional)
PORT=3000
NODE_ENV=development
```

### Gmail Setup

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Use the App Password** in `EMAIL_PASSWORD`

### WhatsApp Setup

1. **Get Group/Contact ID**:
   - Start the bot
   - Visit `http://localhost:3000/list-groups`
   - Copy the Group ID or Contact ID
   - Add to `WHATSAPP_RECIPIENT_ID`

## Usage 📖

### Web Interface

1. **Open** `http://localhost:3000`
2. **Scan QR Code** with WhatsApp (if not connected)
3. **Click "Get Latest Code"** to fetch Netflix codes
4. **Click "Send to WhatsApp"** to send to your group/contact

### API Endpoints

- `GET /` - Web interface
- `GET /health` - Health check
- `GET /status` - WhatsApp connection status
- `GET /fetch-latest-code` - Get latest Netflix code
- `POST /send-to-whatsapp` - Send code to WhatsApp
- `GET /list-groups` - List WhatsApp groups/contacts

### Query Parameters

- `?hours=2` - Check emails from last 2 hours
- `?days=1` - Check emails from last 1 day

## Deployment 🚀

### Railway (Recommended)

1. **Push to GitHub**
2. **Connect Railway** to your repository
3. **Set environment variables** in Railway dashboard
4. **Deploy** - Automatic deployment!

### Render

1. **Create new Web Service**
2. **Connect GitHub repository**
3. **Set environment variables**
4. **Deploy**

### VPS/Server

```bash
# Install dependencies
npm install

# Set environment variables
export NODE_ENV=production
export EMAIL_USER=your-email@gmail.com
# ... other variables

# Start with PM2
npm install -g pm2
pm2 start main.js --name netflix-bot
pm2 startup
pm2 save
```

## Development 🛠️

### Project Structure

```
netflix-code-bot/
├── main.js              # Main application file
├── logger.js            # Logging utility
├── package.json         # Dependencies and scripts
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

### Scripts

- `npm run dev` - Development mode (all logs)
- `npm start` - Production mode (errors only)
- `npm test` - Run tests (if available)

### Logging

- **Development**: All logs (info, warn, error)
- **Production**: Only errors

Set `NODE_ENV=production` in deployment platforms.

## Troubleshooting 🔧

### Common Issues

**WhatsApp QR Code Not Appearing**
- Check if WhatsApp is already connected
- Delete `.wwebjs_auth/` folder and restart
- Ensure you're using the latest version

**Email Connection Failed**
- Verify Gmail App Password is correct
- Check if 2FA is enabled
- Ensure IMAP is enabled in Gmail settings

**No Codes Found**
- Check email filters in `.env`
- Verify Netflix emails are being received
- Try increasing the time range

### Debug Mode

Set `NODE_ENV=development` to see all logs:

```bash
NODE_ENV=development node main.js
```

## Contributing 🤝

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer ⚠️

This bot is for educational purposes. Please ensure you comply with:
- Netflix Terms of Service
- WhatsApp Terms of Service
- Gmail Terms of Service
- Applicable laws and regulations

## Support 💬

- **Issues**: [GitHub Issues](https://github.com/yourusername/netflix-code-bot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/netflix-code-bot/discussions)

---

Made with ❤️ for Netflix users everywhere! 