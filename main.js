require('dotenv').config();
const express = require('express');
const path = require('path');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('./logger');

const app = express();
app.use(express.json());
// === WEB UI ===
// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

app.get('/whatsapp-status', (req, res) => {
  res.json({
    ready: whatsappBot.isReady
  });
});

app.get('/whatsapp-qr', (req, res) => {
  logger.info('QR code requested, current QR code:', whatsappBot.qrCode ? 'Available' : 'Not available');
  if (whatsappBot.qrCode) {
    res.json({
      qrCode: whatsappBot.qrCode
    });
  } else {
    res.status(404).json({
      error: 'No QR code available. Please wait for WhatsApp to generate one.'
    });
  }
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
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'No code provided' 
      });
    }

    if (!whatsappBot.isReady) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp not connected. Please scan the QR code above to connect.' 
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