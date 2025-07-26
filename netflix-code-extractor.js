const puppeteer = require('puppeteer');
const logger = require('./logger');

class NetflixAuthHandler {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    // Removed: this.isAuthenticated, this.cookiesPath
  }

  async extractCodeWithAuth(verificationUrl) {
    try {
      const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
      });
      
      const page = await browser.newPage();
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Directly navigate to the verification URL (no authentication)
      logger.info('Navigating to verification URL (no authentication)...');
      await page.goto(verificationUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Only extract code from the specific OTP element
      let extractedCode = null;
      try {
        await page.waitForSelector('div[data-uia="travel-verification-otp"].challenge-code', { timeout: 10000 });
        const codeElement = await page.$('div[data-uia="travel-verification-otp"].challenge-code');
        if (codeElement) {
          const code = await page.evaluate(el => el.textContent.trim(), codeElement);
          if (/^\d{4,8}$/.test(code)) {
            extractedCode = code;
            logger.info('Code found in travel-verification-otp element:', extractedCode);
          }
        }
      } catch (err) {
        logger.warn('travel-verification-otp element not found or code not present:', err.message);
      }
      
      await browser.close();
      
      if (extractedCode) {
        logger.info('Successfully extracted code from verification page:', extractedCode);
        return extractedCode;
      } else {
        logger.warn('No code found in verification page');
        return null;
      }
      
    } catch (error) {
      logger.error('Error extracting code:', error.message);
      return null;
    }
  }
}

module.exports = NetflixAuthHandler; 