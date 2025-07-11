require('dotenv').config();
const express = require('express');
const path = require('path');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');
const logger = require('./logger');
const NetflixAuthHandler = require('./netflix-auth-handler');

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
  netflix: {
    email: process.env.NETFLIX_EMAIL,
    password: process.env.NETFLIX_PASSWORD
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

  static async extractCode(content) {
    // First try to extract a code (4-8 digit number) from email content
    const codeMatch = content.match(/\b\d{4,8}\b/);
    if (codeMatch) {
      logger.info('Code found directly in email content:', codeMatch[0]);
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
    
    if (relevant) {
      logger.info('Found verification link, opening with Puppeteer:', relevant);
      try {
        const browser = await puppeteer.launch({ 
          headless: true, 
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
        });
        const page = await browser.newPage();
        
        // Set user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        logger.info('Navigating to verification page...');
        await page.goto(relevant, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Check if we need to login to Netflix
        const isLoginRequired = await page.evaluate(() => {
          // Check for login page indicators
          return document.querySelector('input[name="userLoginId"]') !== null ||
                 document.querySelector('input[name="password"]') !== null ||
                 document.querySelector('[data-uia="login-form"]') !== null ||
                 document.querySelector('.login-form') !== null ||
                 document.title.includes('Sign In') ||
                 document.title.includes('Login');
        });
        
        if (isLoginRequired) {
          logger.warn('Netflix login required. Cannot access verification page without authentication.');
          
          // Try to extract any visible information from the login page
          const loginPageInfo = await page.evaluate(() => {
            const text = document.body.innerText;
            // Look for any codes or instructions on the login page
            const codeMatch = text.match(/\b\d{4,8}\b/);
            return codeMatch ? codeMatch[0] : null;
          });
          
          if (loginPageInfo) {
            logger.info('Found code on login page:', loginPageInfo);
            await browser.close();
            return loginPageInfo;
          }
          
          // Try alternative approaches for Netflix verification
          logger.info('Attempting alternative Netflix verification methods...');
          
          // Method 1: Try to extract token from URL and make API call
          const urlParams = new URL(relevant).searchParams;
          const nftoken = urlParams.get('nftoken');
          const messageGuid = urlParams.get('messageGuid');
          
          if (nftoken && messageGuid) {
            logger.info('Found Netflix token, attempting API verification...');
            
            try {
              // Try to make a direct API call to Netflix verification endpoint
              const response = await page.evaluate(async (token, guid) => {
                const apiUrl = `https://www.netflix.com/api/shakti/verify?nftoken=${token}&messageGuid=${guid}`;
                const response = await fetch(apiUrl, {
                  method: 'GET',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                  }
                });
                
                if (response.ok) {
                  const data = await response.json();
                  return data;
                }
                return null;
              }, nftoken, messageGuid);
              
              if (response && response.code) {
                logger.info('Successfully extracted code via API:', response.code);
                await browser.close();
                return response.code;
              }
            } catch (apiError) {
              logger.warn('API verification failed:', apiError.message);
            }
          }
          
          // Method 2: Try Netflix authentication if credentials are available
          if (config.netflix.email && config.netflix.password) {
            logger.info('Attempting Netflix authentication to access verification page...');
            
            try {
              const authHandler = new NetflixAuthHandler(config.netflix.email, config.netflix.password);
              const authCode = await authHandler.extractCodeWithAuth(relevant);
              
              if (authCode) {
                logger.info('Successfully extracted code with Netflix authentication:', authCode);
                return authCode;
              }
            } catch (authError) {
              logger.warn('Netflix authentication failed:', authError.message);
            }
          }
          
          // Method 3: Try to extract from email content more thoroughly
          logger.info('Falling back to enhanced email content extraction...');
          await browser.close();
          
          // Enhanced regex patterns for Netflix codes
          const enhancedPatterns = [
            /\b\d{4,8}\b/g,  // Standard 4-8 digit codes
            /\b[A-Z0-9]{4,8}\b/g,  // Alphanumeric codes
            /\b[A-Z]{2,4}\d{2,4}\b/g,  // Mixed alphanumeric
            /\b\d{3,4}[A-Z]{2,4}\b/g   // Numbers followed by letters
          ];
          
          for (const pattern of enhancedPatterns) {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
              logger.info('Found code with enhanced pattern:', matches[0]);
              return matches[0];
            }
          }
          
          return null;
        }
        
        // Wait a bit for any dynamic content to load
        await page.waitForTimeout(3000);
        
        // Try multiple selectors to find the code
        const selectors = [
          'div[data-code]',
          '.code',
          '.access-code',
          '.temporary-code',
          '[class*="code"]',
          '[class*="access"]',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', // Headers might contain the code
          'p', 'span', 'div' // General text elements
        ];
        
        let extractedCode = null;
        
        for (const selector of selectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            const elements = await page.$$(selector);
            
            for (const element of elements) {
              const text = await page.evaluate(el => el.textContent, element);
              // Look for 4-8 digit codes in the text
              const codeMatch = text.match(/\b\d{4,8}\b/);
              if (codeMatch) {
                extractedCode = codeMatch[0];
                logger.info(`Code found using selector "${selector}":`, extractedCode);
                break;
              }
            }
            
            if (extractedCode) break;
          } catch (err) {
            // Continue to next selector if this one fails
            continue;
          }
        }
        
        // If no code found with selectors, try to extract from page content
        if (!extractedCode) {
          const pageContent = await page.content();
          const codeMatch = pageContent.match(/\b\d{4,8}\b/);
          if (codeMatch) {
            extractedCode = codeMatch[0];
            logger.info('Code found in page content:', extractedCode);
          }
        }
        
        await browser.close();
        
        if (extractedCode) {
          logger.info('Successfully extracted code from verification page:', extractedCode);
          return extractedCode;
        } else {
          logger.warn('No code found on verification page');
          return null;
        }
        
      } catch (err) {
        logger.error('Failed to extract code from verification page:', err);
        return null;
      }
    }
    
    return null;
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

    const code = await EmailService.extractCode(email.content);
    if (!code) {
      return res.status(404).json({ 
        success: false, 
        error: 'No code or relevant link found in the latest email.' 
      });
    }
    
    // Auto-send to WhatsApp if enabled and WhatsApp is ready
    let whatsappSent = false;
    let whatsappError = null;
    
    if (req.query.autoSend !== 'false' && whatsappBot.isReady) {
      try {
        const botMessage = `🤖 Netflix Code Bot:\n\n${code}`;
        await whatsappBot.sendMessage(botMessage);
        whatsappSent = true;
        logger.info('Code automatically sent to WhatsApp:', code);
      } catch (whatsappErr) {
        whatsappError = whatsappErr.message;
        logger.error('Failed to auto-send to WhatsApp:', whatsappErr.message);
      }
    } else if (!whatsappBot.isReady) {
      whatsappError = 'WhatsApp not connected';
      logger.warn('WhatsApp not ready for auto-send');
    }
    
    return res.json({ 
      success: true, 
      message: 'Code found!', 
      sent: code,
      whatsappSent: whatsappSent,
      whatsappError: whatsappError
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

app.get('/auto-fetch-and-send', async (req, res) => {
  try {
    if (!config.whatsapp.recipientId) {
      return res.status(400).json({ 
        success: false, 
        error: 'WHATSAPP_RECIPIENT_ID not set in .env' 
      });
    }

    if (!whatsappBot.isReady) {
      return res.status(503).json({ 
        success: false, 
        error: 'WhatsApp not connected. Please scan the QR code first.' 
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

    logger.info('Starting automatic code fetch and send...');

    const email = await EmailService.getLatestMatchingEmail(lookbackHours);
    if (!email) {
      return res.status(404).json({ 
        success: false, 
        error: 'No matching email found.' 
      });
    }

    const code = await EmailService.extractCode(email.content);
    if (!code) {
      return res.status(404).json({ 
        success: false, 
        error: 'No code or relevant link found in the latest email.' 
      });
    }
    
    // Send to WhatsApp automatically
    const botMessage = `🤖 Netflix Code Bot:\n\n${code}`;
    await whatsappBot.sendMessage(botMessage);
    
    logger.info('Code automatically fetched and sent to WhatsApp:', code);
    
    return res.json({ 
      success: true, 
      message: 'Code found and sent to WhatsApp!', 
      code: code,
      emailSubject: email.subject,
      emailDate: email.date
    });
    
  } catch (err) {
    logger.error('Auto-fetch-and-send Error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch and send code.' 
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

// === AUTO-SCHEDULER ===
class AutoScheduler {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.checkInterval = parseInt(process.env.AUTO_CHECK_INTERVAL) || 30; // minutes
  }

  async checkAndSendCode() {
    if (this.isRunning) {
      logger.info('Auto-check already running, skipping...');
      return;
    }

    this.isRunning = true;
    
    try {
      logger.info('Running automatic code check...');
      
      if (!whatsappBot.isReady) {
        logger.warn('WhatsApp not ready, skipping auto-check');
        return;
      }

      const email = await EmailService.getLatestMatchingEmail(2); // Check last 2 hours
      if (!email) {
        logger.info('No new emails found in auto-check');
        return;
      }

      const code = await EmailService.extractCode(email.content);
      if (!code) {
        logger.info('No code found in latest email during auto-check');
        return;
      }

      // Send to WhatsApp
      const botMessage = `🤖 Netflix Code Bot (Auto):\n\n${code}`;
      await whatsappBot.sendMessage(botMessage);
      
      logger.info('Code automatically sent via scheduler:', code);
      
    } catch (error) {
      logger.error('Auto-scheduler error:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    
    const intervalMs = this.checkInterval * 60 * 1000; // Convert minutes to milliseconds
    this.interval = setInterval(() => {
      this.checkAndSendCode();
    }, intervalMs);
    
    logger.info(`Auto-scheduler started, checking every ${this.checkInterval} minutes`);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Auto-scheduler stopped');
    }
  }
}

// === INITIALIZATION ===
const whatsappBot = new WhatsAppBot();
const autoScheduler = new AutoScheduler();

const server = app.listen(config.server.port, () => {
  logger.info(`Netflix Code Bot running on http://localhost:${config.server.port}`);
  logger.info(`Email: ${config.email.user}`);
  logger.info(`WhatsApp: ${config.whatsapp.recipientId}`);
  
  // Validate configuration
  validateConfig();
  
  whatsappBot.initialize();
  
  // Start auto-scheduler if enabled
  if (process.env.AUTO_SCHEDULER_ENABLED === 'true') {
    autoScheduler.start();
  }
});

// Auto-scheduler control endpoints
app.post('/scheduler/start', (req, res) => {
  try {
    autoScheduler.start();
    res.json({ 
      success: true, 
      message: 'Auto-scheduler started',
      checkInterval: autoScheduler.checkInterval
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start scheduler' 
    });
  }
});

app.post('/scheduler/stop', (req, res) => {
  try {
    autoScheduler.stop();
    res.json({ 
      success: true, 
      message: 'Auto-scheduler stopped' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to stop scheduler' 
    });
  }
});

app.get('/scheduler/status', (req, res) => {
  res.json({ 
    success: true, 
    isRunning: autoScheduler.interval !== null,
    checkInterval: autoScheduler.checkInterval,
    isRunning: autoScheduler.isRunning
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  autoScheduler.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  autoScheduler.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});