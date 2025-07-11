# Testing Guide for Netflix Code Bot

## 🧪 How to Test the Puppeteer Code Extraction

### **1. Basic Functionality Tests**

#### **Test Direct Code Extraction**
```bash
# Test with direct codes in email content
curl -X POST http://localhost:3000/fetch-latest-code
```

#### **Test with Different Email Scenarios**
- ✅ **Direct code in email**: "Your code is 123456"
- ✅ **Multiple codes**: "Code 1: 111111, Code 2: 222222"
- ✅ **No codes**: "Regular email content"
- 🔄 **Verification links**: "Click https://netflix.com/verify/abc123"

### **2. Puppeteer Browser Testing**

#### **Run the Test Suite**
```bash
node test-puppeteer.js
```

This will test:
- ✅ Code extraction from email content
- ✅ Puppeteer with mock verification pages
- ✅ Realistic Netflix page structures
- ✅ Multiple CSS selectors for code finding

#### **Manual Browser Testing**
1. **Start the server**: `npm start`
2. **Open browser**: `http://localhost:3000`
3. **Check WhatsApp connection**: Scan QR code if needed
4. **Test code fetching**: Click "Get Latest Code"
5. **Test WhatsApp sending**: Click "Send to WhatsApp"

### **3. API Endpoint Testing**

#### **Health Check**
```bash
curl http://localhost:3000/health
```

#### **Status Check**
```bash
curl http://localhost:3000/status
```

#### **Fetch Latest Code**
```bash
curl http://localhost:3000/fetch-latest-code
```

#### **Send to WhatsApp**
```bash
curl -X POST http://localhost:3000/send-to-whatsapp \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

### **4. Real Email Testing**

#### **Setup Test Email**
1. **Configure your .env file** with real email credentials
2. **Send yourself a test email** with a Netflix verification link
3. **Run the fetch endpoint** to test real extraction

#### **Test Different Email Providers**
- ✅ Gmail (IMAP)
- ✅ Outlook/Hotmail
- ✅ Yahoo Mail
- ✅ Custom IMAP servers

### **5. Puppeteer Debugging**

#### **Enable Visible Browser**
In `main.js`, change:
```javascript
const browser = await puppeteer.launch({ 
  headless: false, // Set to false to see browser
  args: ['--no-sandbox', '--disable-setuid-sandbox'] 
});
```

#### **Add Screenshots for Debugging**
```javascript
// Add this in the extractCode method
await page.screenshot({ path: 'debug-screenshot.png' });
```

#### **Check Browser Console**
```javascript
// Add this to see page console logs
page.on('console', msg => console.log('Browser:', msg.text()));
```

### **6. Error Scenarios to Test**

#### **Network Issues**
- ❌ **Invalid verification links**
- ❌ **Timeout scenarios**
- ❌ **Network connectivity issues**

#### **Page Structure Issues**
- ❌ **Different Netflix page layouts**
- ❌ **Dynamic content loading**
- ❌ **Anti-bot protection**

#### **Email Issues**
- ❌ **Empty emails**
- ❌ **Malformed email content**
- ❌ **Missing verification links**

### **7. Performance Testing**

#### **Response Time Testing**
```bash
# Test API response time
time curl http://localhost:3000/fetch-latest-code
```

#### **Concurrent Requests**
```bash
# Test multiple simultaneous requests
for i in {1..5}; do
  curl http://localhost:3000/fetch-latest-code &
done
wait
```

### **8. WhatsApp Integration Testing**

#### **Connection Testing**
1. **Check WhatsApp status**: `curl http://localhost:3000/whatsapp-status`
2. **Get QR code**: `curl http://localhost:3000/whatsapp-qr`
3. **Test message sending**: Use the web interface

#### **Message Format Testing**
- ✅ **Simple codes**: "123456"
- ✅ **Long codes**: "12345678"
- ✅ **Special characters**: "ABC-123"

### **9. Logging and Monitoring**

#### **Check Application Logs**
```bash
# Monitor logs in real-time
tail -f logs/app.log
```

#### **Key Log Messages to Watch**
- ✅ "Code found directly in email content"
- ✅ "Found verification link, opening with Puppeteer"
- ✅ "Successfully extracted code from verification page"
- ❌ "Failed to extract code from verification page"
- ❌ "No code found on verification page"

### **10. Environment Testing**

#### **Different Operating Systems**
- ✅ **macOS** (current)
- ✅ **Linux** (headless mode)
- ✅ **Windows** (if needed)

#### **Different Node.js Versions**
- ✅ **Node.js 16+** (required)
- ✅ **Node.js 18+** (recommended)
- ✅ **Node.js 20+** (latest)

### **11. Troubleshooting Common Issues**

#### **Puppeteer Installation Issues**
```bash
# Reinstall Puppeteer
npm uninstall puppeteer
npm install puppeteer
```

#### **Browser Launch Issues**
```bash
# Check if Chrome is available
which google-chrome
which chromium-browser
```

#### **Permission Issues**
```bash
# Fix sandbox issues
sudo chmod -R 777 /tmp
```

### **12. Success Criteria**

#### **✅ All Tests Should Pass**
- [ ] Direct code extraction works
- [ ] Puppeteer opens verification links
- [ ] Code extraction from web pages works
- [ ] WhatsApp integration works
- [ ] Error handling works properly
- [ ] Logging provides useful information

#### **✅ Performance Requirements**
- [ ] Code extraction completes within 30 seconds
- [ ] API responses are under 5 seconds
- [ ] Memory usage stays reasonable
- [ ] No memory leaks during operation

### **13. Next Steps After Testing**

1. **Deploy to production** if all tests pass
2. **Set up monitoring** for real-world usage
3. **Configure error alerts** for failures
4. **Document any issues** found during testing
5. **Optimize performance** based on test results

---

## 🚀 Quick Test Commands

```bash
# Start the server
npm start

# Run all tests
node test-puppeteer.js

# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:3000/fetch-latest-code

# Open web interface
open http://localhost:3000
```

Happy testing! 🎯 