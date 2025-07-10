require('dotenv').config();
const express = require('express');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('./logger');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// === CONFIGURATION ===
const config = {
  email: {
    host: process.env.EMAIL_HOST || 'imap.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 993,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    sender: process.env.EMAIL_SENDER_FILTER,
    subjects: process.env.EMAIL_SUBJECT_FILTER 
      ? process.env.EMAIL_SUBJECT_FILTER.split(',').map(s => s.trim()).filter(Boolean)
      : []
  },
  whatsapp: {
    recipientId: process.env.WHATSAPP_RECIPIENT_ID
  },
  server: {
    port: process.env.PORT || 3000
  }
};

// Validate required environment variables
function validateConfig() {
  const required = [
    'EMAIL_USER',
    'EMAIL_PASSWORD', 
    'EMAIL_SENDER_FILTER',
    'WHATSAPP_RECIPIENT_ID'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error('Missing required environment variables:', missing.join(', '));
    logger.error('Please check your .env file');
    process.exit(1);
  }
  
  logger.info('All required environment variables are set');
}

// === WHATSAPP CLIENT ===
class WhatsAppBot {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: { headless: true, args: ['--no-sandbox'] }
    });
    this.isReady = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.client.on('qr', (qr) => {
      logger.info('QR code generated - scan with WhatsApp');
      qrcode.generate(qr, { small: true });
      
      // Emit QR code to web UI
      this.qrCode = qr;
      this.emitQRToWeb();
    });

    this.client.on('loading_screen', (percent, message) => {
      logger.info(`WhatsApp loading: ${percent}%`);
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp authenticated successfully');
    });

    this.client.on('auth_failure', (msg) => {
      logger.error('WhatsApp authentication failed:', msg);
    });

    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      logger.error('WhatsApp disconnected:', reason);
    });

    this.client.on('ready', () => {
      this.isReady = true;
      logger.info('WhatsApp bot is ready');
    });
  }

  async sendMessage(text) {
    if (!this.isReady) {
      throw new Error('WhatsApp not ready');
    }
    await this.client.sendMessage(config.whatsapp.recipientId, text);
  }

  emitQRToWeb() {
    // Clear any previous QR code when new one is generated
    this.qrCode = this.qrCode;
  }

  initialize() {
    this.client.initialize();
  }
}

// === EMAIL SERVICE ===
class EmailService {
  static async getLatestMatchingEmail(lookbackHours = 24) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: config.email.user,
        password: config.email.password,
        host: config.email.host,
        port: config.email.port,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) return reject(err);
          
          const sinceDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
          const searchCriteria = [
            ['FROM', config.email.sender],
            ['SINCE', sinceDate.toISOString().slice(0, 10)]
          ];

          // Add subject filters if configured
          if (config.email.subjects.length > 0) {
            if (config.email.subjects.length === 1) {
              searchCriteria.push(['SUBJECT', config.email.subjects[0]]);
            } else {
              let orChain = ['OR', ['SUBJECT', config.email.subjects[0]], ['SUBJECT', config.email.subjects[1]]];
              for (let i = 2; i < config.email.subjects.length; i++) {
                orChain = ['OR', orChain, ['SUBJECT', config.email.subjects[i]]];
              }
              searchCriteria.push(orChain);
            }
          }

          imap.search(searchCriteria, (err, results) => {
            if (err) return reject(err);
            if (!results || results.length === 0) {
              imap.end();
              return resolve(null);
            }

            // Get the latest email
            const latest = results[results.length - 1];
            const f = imap.fetch(latest, { bodies: '' });
            
            f.on('message', (msg, seqno) => {
              msg.on('body', (stream, info) => {
                simpleParser(stream, (err, parsed) => {
                  if (err) return reject(err);
                  
                  const emailDate = new Date(parsed.date);
                  if ((Date.now() - emailDate.getTime()) > lookbackHours * 60 * 60 * 1000) {
                    return resolve(null);
                  }
                  
                  resolve({
                    subject: parsed.subject,
                    from: parsed.from?.text,
                    content: parsed.text || parsed.html || '',
                    date: parsed.date
                  });
                });
              });
            });
            
            f.once('end', () => imap.end());
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  static extractCode(content) {
    // First try to extract a code (4-8 digit number)
    const codeMatch = content.match(/\b\d{4,8}\b/);
    if (codeMatch) {
      return codeMatch[0];
    }

    // If no code found, try to extract a relevant link
    const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
    const matches = content.match(urlRegex);
    if (!matches) return null;

    // Filter for links that look like code/verify links
    const relevant = matches.find(link =>
      link.includes('/verify') ||
      link.includes('/code')
    );
    
    return relevant || null;
  }
}

// === WEB UI ===
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Netflix Code Bot</title>
        <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                padding: 40px;
                text-align: center;
                max-width: 500px;
                width: 100%;
            }
            
            .logo {
                font-size: 48px;
                margin-bottom: 20px;
            }
            
            h1 {
                color: #333;
                margin-bottom: 10px;
                font-size: 28px;
            }
            
            .subtitle {
                color: #666;
                margin-bottom: 30px;
                font-size: 16px;
            }
            
            .btn {
                background: linear-gradient(45deg, #e50914, #b2070f);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 50px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
                margin: 10px;
                min-width: 200px;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(229, 9, 20, 0.3);
            }
            
            .btn:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            
            .result {
                margin-top: 30px;
                padding: 20px;
                border-radius: 10px;
                font-size: 16px;
                display: none;
            }
            
            .success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .code-display {
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                border-radius: 10px;
                padding: 15px;
                margin-top: 15px;
                font-family: 'Courier New', monospace;
                font-size: 18px;
                font-weight: bold;
                word-break: break-all;
            }
            
            .loading {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #e50914;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 10px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .status {
                margin-top: 20px;
                padding: 10px;
                border-radius: 5px;
                font-size: 14px;
            }
            
            .status.ready {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            
            .status.connecting {
                background: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
            }
            
            .qr-container {
                margin: 20px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 10px;
                border: 2px solid #e9ecef;
            }
            
            .qr-container h3 {
                margin-bottom: 15px;
                color: #333;
            }
            
            .qr-container p {
                margin-top: 15px;
                color: #666;
                font-size: 14px;
            }
            
            #qrCode {
                display: flex;
                justify-content: center;
                margin: 15px 0;
            }
            
            #qrCode canvas {
                border: 2px solid #ddd;
                border-radius: 8px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🎬</div>
            <h1>Netflix Code Bot</h1>
            <p class="subtitle">Get the latest Netflix temporary access code</p>
            
            <div id="status" class="status connecting">
                <span class="loading"></span>Connecting to WhatsApp...
            </div>
            
            <div id="qrContainer" class="qr-container" style="display: none;">
                <h3>Scan QR Code with WhatsApp</h3>
                <div id="qrCode"></div>
                <p>Open WhatsApp → Settings → Linked Devices → Link a Device</p>
            </div>
            
            <button id="fetchBtn" class="btn" onclick="fetchCode()">
                Get Latest Code
            </button>
            
            <button id="sendBtn" class="btn" onclick="sendToWhatsApp()" disabled>
                Send to WhatsApp
            </button>
            
            <div id="result" class="result"></div>
        </div>

        <script>
            let currentCode = null;
            
            // Check WhatsApp status
            async function checkStatus() {
                try {
                    const response = await fetch('/status');
                    const data = await response.json();
                    
                    const statusDiv = document.getElementById('status');
                    const fetchBtn = document.getElementById('fetchBtn');
                    const sendBtn = document.getElementById('sendBtn');
                    const qrContainer = document.getElementById('qrContainer');
                    const qrCodeDiv = document.getElementById('qrCode');
                    
                    if (data.ready) {
                        statusDiv.className = 'status ready';
                        statusDiv.innerHTML = '✅ WhatsApp connected and ready!';
                        sendBtn.disabled = false;
                        qrContainer.style.display = 'none';
                    } else {
                        statusDiv.className = 'status connecting';
                        statusDiv.innerHTML = '<span class="loading"></span>WhatsApp connecting... (Code fetching still works)';
                        sendBtn.disabled = true;
                        
                        // Show QR code if available
                        if (data.qrCode) {
                            qrContainer.style.display = 'block';
                            // Generate QR code using qrcode-generator library
                            if (typeof qrcode !== 'undefined') {
                                qrCodeDiv.innerHTML = '';
                                try {
                                    const qr = qrcode(0, 'M');
                                    qr.addData(data.qrCode);
                                    qr.make();
                                    qrCodeDiv.innerHTML = qr.createImgTag(5, 2);
                                } catch (error) {
                                    logger.error('QR Code generation failed:', error);
                                }
                            } else {
                                // Fallback: show QR code as text
                                qrCodeDiv.innerHTML = '<p style="color: red;">QR Code library failed to load. Please check the terminal for QR code.</p>';
                            }
                        } else {
                            qrContainer.style.display = 'none';
                        }
                    }
                    
                    // Always enable fetch button - WhatsApp not needed for fetching
                    fetchBtn.disabled = false;
                } catch (error) {
                    // Silent fail for status check
                }
            }
            
            // Fetch Netflix code
            async function fetchCode() {
                const fetchBtn = document.getElementById('fetchBtn');
                const resultDiv = document.getElementById('result');
                
                fetchBtn.disabled = true;
                fetchBtn.innerHTML = '<span class="loading"></span>Fetching...';
                resultDiv.style.display = 'none';
                
                try {
                    const response = await fetch('/fetch-latest-code');
                    const data = await response.json();
                    
                    if (data.success) {
                        currentCode = data.sent;
                        resultDiv.className = 'result success';
                        resultDiv.innerHTML = \`
                            <strong>✅ Code Found!</strong><br>
                            <div class="code-display">\${data.sent}</div>
                        \`;
                        document.getElementById('sendBtn').disabled = false;
                    } else {
                        resultDiv.className = 'result error';
                        resultDiv.innerHTML = \`❌ \${data.error}\`;
                    }
                } catch (error) {
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = '❌ Network error. Please try again.';
                } finally {
                    fetchBtn.disabled = false;
                    fetchBtn.innerHTML = 'Get Latest Code';
                    resultDiv.style.display = 'block';
                }
            }
            
            // Send to WhatsApp
            async function sendToWhatsApp() {
                if (!currentCode) {
                    alert('No code to send. Please fetch a code first.');
                    return;
                }
                
                const sendBtn = document.getElementById('sendBtn');
                const resultDiv = document.getElementById('result');
                
                sendBtn.disabled = true;
                sendBtn.innerHTML = '<span class="loading"></span>Sending...';
                
                try {
                    const response = await fetch('/send-to-whatsapp', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ code: currentCode })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        resultDiv.className = 'result success';
                        resultDiv.innerHTML = '✅ Code sent to WhatsApp successfully!';
                    } else {
                        resultDiv.className = 'result error';
                        resultDiv.innerHTML = \`❌ \${data.error}\`;
                    }
                } catch (error) {
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = '❌ Failed to send to WhatsApp.';
                } finally {
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = 'Send to WhatsApp';
                }
            }
            
            // Check status every 5 seconds
            setInterval(checkStatus, 5000);
            checkStatus();
        </script>
    </body>
    </html>
  `);
});

// === API ROUTES ===
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.get('/status', (req, res) => {
  const status = {
    ready: whatsappBot.isReady,
    recipient: config.whatsapp.recipientId ? 'Configured' : 'Not configured',
    qrCode: whatsappBot.qrCode || null
  };
  
  res.json(status);
});

app.get('/fetch-latest-code', async (req, res) => {
  try {
    if (!config.whatsapp.recipientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'WHATSAPP_RECIPIENT_ID not set in .env' 
      });
    }

    // Customizable lookback window
    let lookbackHours = 24;
    if (req.query.days) {
      const days = parseFloat(req.query.days);
      if (!isNaN(days) && days > 0) lookbackHours = days * 24;
    } else if (req.query.hours) {
      const hours = parseFloat(req.query.hours);
      if (!isNaN(hours) && hours > 0) lookbackHours = hours;
    }

    const email = await EmailService.getLatestMatchingEmail(lookbackHours);
    if (!email) {
      return res.status(404).json({ 
        success: false, 
        error: 'No matching email found.' 
      });
    }

    const code = EmailService.extractCode(email.content);
    if (!code) {
      return res.status(404).json({ 
        success: false, 
        error: 'No code or relevant link found in the latest email.' 
      });
    }
    
    return res.json({ 
      success: true, 
      message: 'Code found!', 
      sent: code 
    });
    
      } catch (err) {
      logger.error('API Error:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error.' 
      });
    }
});

app.post('/send-to-whatsapp', async (req, res) => {
  try {
    if (!whatsappBot.isReady) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp not ready. Scan QR code in terminal.' 
      });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'No code provided' 
      });
    }

    const botMessage = `🤖 Netflix Code Bot:\n\n${code}`;
    await whatsappBot.sendMessage(botMessage);
    
    return res.json({ 
      success: true, 
      message: 'Sent to WhatsApp!' 
    });
    
      } catch (err) {
      logger.error('Send Error:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send to WhatsApp.' 
      });
    }
});

app.get('/list-groups', async (req, res) => {
  try {
    if (!whatsappBot.isReady) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp not ready.' 
      });
    }

    const chats = await whatsappBot.client.getChats();
    const groups = chats.filter(chat => chat.isGroup);
    const contacts = chats.filter(chat => !chat.isGroup);
    
    logger.info('WhatsApp groups and contacts listed');
    
    return res.json({ 
      success: true, 
      groups: groups.map(group => ({
        name: group.name,
        id: group.id._serialized,
        participants: group.participants.length
      })),
      contacts: contacts.map(contact => ({
        name: contact.name || contact.pushname || 'Unknown',
        id: contact.id._serialized,
        number: contact.number
      }))
    });
    
      } catch (err) {
      logger.error('Error listing groups:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to list groups' 
      });
    }
});

// === INITIALIZATION ===
const whatsappBot = new WhatsAppBot();

const server = app.listen(config.server.port, () => {
  logger.info(`Netflix Code Bot running on http://localhost:${config.server.port}`);
  logger.info(`Email: ${config.email.user}`);
  logger.info(`WhatsApp: ${config.whatsapp.recipientId}`);
  
  // Validate configuration
  validateConfig();
  
  whatsappBot.initialize();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
}); 