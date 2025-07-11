const puppeteer = require('puppeteer');
const logger = require('./logger');

class NetflixAuthHandler {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.isAuthenticated = false;
  }

  async authenticate(page) {
    try {
      logger.info('Attempting Netflix authentication...');
      
      // Navigate to Netflix login page
      await page.goto('https://www.netflix.com/login', { waitUntil: 'networkidle2' });
      
      // Wait for login form to load
      await page.waitForSelector('input[name="userLoginId"]', { timeout: 10000 });
      
      // Fill in email
      await page.type('input[name="userLoginId"]', this.email);
      
      // Fill in password
      await page.type('input[name="password"]', this.password);
      
      // Click sign in button
      await page.click('button[type="submit"]');
      
      // Wait for authentication to complete
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      // Check if login was successful
      const isLoggedIn = await page.evaluate(() => {
        return !document.querySelector('input[name="userLoginId"]') &&
               !document.querySelector('.login-form') &&
               (document.title.includes('Netflix') || document.title.includes('Home'));
      });
      
      if (isLoggedIn) {
        this.isAuthenticated = true;
        logger.info('Netflix authentication successful');
        return true;
      } else {
        logger.error('Netflix authentication failed');
        return false;
      }
      
    } catch (error) {
      logger.error('Netflix authentication error:', error.message);
      return false;
    }
  }

  async extractCodeWithAuth(verificationUrl) {
    if (!this.email || !this.password) {
      logger.warn('Netflix credentials not provided, skipping authentication');
      return null;
    }

    try {
      const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
      });
      
      const page = await browser.newPage();
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Authenticate first
      const authSuccess = await this.authenticate(page);
      
      if (!authSuccess) {
        await browser.close();
        return null;
      }
      
      // Now navigate to the verification URL
      logger.info('Navigating to verification URL with authentication...');
      await page.goto(verificationUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for page to load
      await page.waitForTimeout(3000);
      
      // Extract code from the authenticated page
      const code = await page.evaluate(() => {
        // Try multiple selectors for Netflix verification codes
        const selectors = [
          '.verification-code',
          '.access-code',
          '.temporary-code',
          '[data-testid="verification-code"]',
          '.code-display',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'span', 'div'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent;
            // Look for 4-8 digit codes
            const codeMatch = text.match(/\b\d{4,8}\b/);
            if (codeMatch) {
              return codeMatch[0];
            }
          }
        }
        
        // Fallback to page content
        const pageText = document.body.innerText;
        const codeMatch = pageText.match(/\b\d{4,8}\b/);
        return codeMatch ? codeMatch[0] : null;
      });
      
      await browser.close();
      
      if (code) {
        logger.info('Successfully extracted code with authentication:', code);
        return code;
      } else {
        logger.warn('No code found even with authentication');
        return null;
      }
      
    } catch (error) {
      logger.error('Error extracting code with authentication:', error.message);
      return null;
    }
  }

  async saveCookies(page) {
    try {
      const cookies = await page.cookies();
      // Save cookies to file or database for future use
      logger.info('Netflix cookies saved for future use');
      return cookies;
    } catch (error) {
      logger.error('Error saving cookies:', error.message);
      return null;
    }
  }

  async loadCookies(page, cookies) {
    try {
      await page.setCookie(...cookies);
      logger.info('Netflix cookies loaded');
      return true;
    } catch (error) {
      logger.error('Error loading cookies:', error.message);
      return false;
    }
  }
}

module.exports = NetflixAuthHandler; 