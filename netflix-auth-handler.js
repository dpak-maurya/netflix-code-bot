const puppeteer = require('puppeteer');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

class NetflixAuthHandler {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.isAuthenticated = false;
    this.cookiesPath = path.join(__dirname, 'netflix-cookies.json');
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
        // Save cookies after successful login
        const cookies = await this.saveCookies(page);
        try {
          fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
          logger.info('Netflix cookies saved to file');
        } catch (err) {
          logger.warn('Failed to save Netflix cookies to file:', err.message);
        }
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
      
      // Try to load cookies if available
      let cookiesLoaded = false;
      if (fs.existsSync(this.cookiesPath)) {
        try {
          const cookies = JSON.parse(fs.readFileSync(this.cookiesPath, 'utf-8'));
          await this.loadCookies(page, cookies);
          cookiesLoaded = true;
          logger.info('Loaded Netflix cookies from file');
        } catch (err) {
          logger.warn('Failed to load Netflix cookies from file:', err.message);
        }
      }
      // Test if cookies are still valid by visiting Netflix home
      let needLogin = true;
      if (cookiesLoaded) {
        try {
          await page.goto('https://www.netflix.com/browse', { waitUntil: 'networkidle2', timeout: 30000 });
          // If redirected to login, cookies are invalid
          const isLoginPage = await page.evaluate(() => {
            return document.querySelector('input[name="userLoginId"]') !== null;
          });
          if (!isLoginPage) {
            logger.info('Netflix cookies are valid, skipping login');
            needLogin = false;
          } else {
            logger.info('Netflix cookies expired, need to login again');
          }
        } catch (err) {
          logger.warn('Error testing Netflix cookies:', err.message);
        }
      }
      // If cookies are not valid, perform login
      if (needLogin) {
        const authSuccess = await this.authenticate(page);
        if (!authSuccess) {
          await browser.close();
          return null;
        }
      }
      
      // Now navigate to the verification URL
      logger.info('Navigating to verification URL with authentication...');
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