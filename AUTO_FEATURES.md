# 🤖 Automatic Features Guide

## **Overview**
Your Netflix Code Bot now has multiple automatic features that can fetch codes and send them to WhatsApp without manual intervention!

## **🚀 Available Automatic Features**

### **1. Auto-Send with Fetch**
- **Endpoint**: `GET /fetch-latest-code?autoSend=true`
- **Description**: Fetches code and automatically sends to WhatsApp
- **Usage**: Add `?autoSend=true` to enable auto-send

### **2. Dedicated Auto Endpoint**
- **Endpoint**: `GET /auto-fetch-and-send`
- **Description**: One-click fetch and send to WhatsApp
- **Requirements**: WhatsApp must be connected

### **3. Scheduled Auto-Checker**
- **Feature**: Automatically checks for new codes every X minutes
- **Configurable**: Set check interval via environment variables
- **Smart**: Only sends if new codes are found

## **🎯 How to Use Each Feature**

### **Feature 1: Auto-Send with Fetch**
```bash
# Enable auto-send when fetching
curl "http://localhost:3000/fetch-latest-code?autoSend=true"

# Disable auto-send (default)
curl "http://localhost:3000/fetch-latest-code?autoSend=false"
```

**Response:**
```json
{
  "success": true,
  "message": "Code found!",
  "sent": "123456",
  "whatsappSent": true,
  "whatsappError": null
}
```

### **Feature 2: Dedicated Auto Endpoint**
```bash
# One-click fetch and send
curl "http://localhost:3000/auto-fetch-and-send"
```

**Response:**
```json
{
  "success": true,
  "message": "Code found and sent to WhatsApp!",
  "code": "123456",
  "emailSubject": "Your Netflix temporary access code",
  "emailDate": "2024-01-15T10:30:00Z"
}
```

### **Feature 3: Scheduled Auto-Checker**
```bash
# Start the scheduler
curl -X POST "http://localhost:3000/scheduler/start"

# Stop the scheduler
curl -X POST "http://localhost:3000/scheduler/stop"

# Check scheduler status
curl "http://localhost:3000/scheduler/status"
```

## **🔧 Configuration**

### **Environment Variables**
Add these to your `.env` file:

```bash
# Auto-Scheduler Configuration
AUTO_SCHEDULER_ENABLED=true          # Enable/disable scheduler
AUTO_CHECK_INTERVAL=30              # Check every 30 minutes
```

### **Configuration Options**
- **AUTO_SCHEDULER_ENABLED**: `true` or `false`
- **AUTO_CHECK_INTERVAL**: Minutes between checks (default: 30)

## **📱 Web Interface**

### **New Auto Button**
- **Location**: Main interface, next to "Get Latest Code"
- **Function**: One-click fetch and send
- **Color**: Green gradient (different from regular fetch)

### **Enhanced Status Messages**
- ✅ **"Code found! ✅ Sent to WhatsApp"**
- ⚠️ **"Code found! ⚠️ WhatsApp: Not connected"**

## **🔄 Auto-Scheduler Details**

### **How It Works**
1. **Checks every X minutes** (configurable)
2. **Looks for emails** from last 2 hours
3. **Extracts codes** using all methods
4. **Sends to WhatsApp** automatically
5. **Logs all activities**

### **Smart Features**
- **Prevents duplicates**: Won't send same code twice
- **Error handling**: Continues working if one check fails
- **WhatsApp ready check**: Only sends when connected
- **Resource efficient**: Uses minimal CPU/memory

### **Log Messages**
```
✅ Running automatic code check...
✅ Code automatically sent via scheduler: 123456
⚠️ WhatsApp not ready, skipping auto-check
ℹ️ No new emails found in auto-check
```

## **🎯 Use Cases**

### **Personal Use**
```bash
# Manual fetch with auto-send
curl "http://localhost:3000/fetch-latest-code?autoSend=true"
```

### **Family/Group Use**
```bash
# Enable scheduler for automatic monitoring
AUTO_SCHEDULER_ENABLED=true
AUTO_CHECK_INTERVAL=15  # Check every 15 minutes
```

### **Development/Testing**
```bash
# Test auto features
curl "http://localhost:3000/auto-fetch-and-send"
curl "http://localhost:3000/scheduler/status"
```

## **🛡️ Safety Features**

### **Duplicate Prevention**
- **Email tracking**: Remembers last processed email
- **Code caching**: Won't send same code multiple times
- **Time limits**: Only checks recent emails

### **Error Recovery**
- **Graceful failures**: Continues working if errors occur
- **Retry logic**: Handles temporary network issues
- **Logging**: Full activity tracking

### **Resource Management**
- **Memory efficient**: Cleans up after each check
- **CPU friendly**: Minimal processing overhead
- **Network smart**: Efficient email checking

## **📊 Monitoring**

### **Check Scheduler Status**
```bash
curl "http://localhost:3000/scheduler/status"
```

**Response:**
```json
{
  "success": true,
  "isRunning": true,
  "checkInterval": 30,
  "isRunning": false
}
```

### **View Logs**
```bash
# Check application logs for auto-scheduler activity
tail -f logs/app.log | grep -i "auto"
```

## **🚨 Troubleshooting**

### **Scheduler Not Starting**
```bash
# Check if enabled
echo $AUTO_SCHEDULER_ENABLED

# Start manually
curl -X POST "http://localhost:3000/scheduler/start"
```

### **WhatsApp Not Sending**
```bash
# Check WhatsApp status
curl "http://localhost:3000/whatsapp-status"

# Scan QR code if needed
# Visit http://localhost:3000
```

### **No Codes Found**
```bash
# Check email configuration
echo $EMAIL_SENDER_FILTER
echo $EMAIL_SUBJECT_FILTER

# Test manual fetch
curl "http://localhost:3000/fetch-latest-code"
```

## **💡 Best Practices**

### **For Personal Use**
1. **Use auto-send with fetch**: `?autoSend=true`
2. **Enable scheduler**: Set `AUTO_SCHEDULER_ENABLED=true`
3. **Set reasonable interval**: 15-30 minutes

### **For Family/Group Use**
1. **Enable scheduler**: Automatic monitoring
2. **Set shorter intervals**: 10-15 minutes
3. **Monitor logs**: Check for issues

### **For Development**
1. **Test manually first**: Use auto-fetch-and-send
2. **Check scheduler status**: Monitor operation
3. **Review logs**: Debug any issues

## **🎉 Quick Start**

### **Enable Auto Features**
```bash
# Add to .env file
AUTO_SCHEDULER_ENABLED=true
AUTO_CHECK_INTERVAL=30

# Restart the application
npm start
```

### **Test Auto Features**
```bash
# Test auto fetch and send
curl "http://localhost:3000/auto-fetch-and-send"

# Check scheduler status
curl "http://localhost:3000/scheduler/status"
```

### **Monitor Operation**
```bash
# Watch logs for auto-scheduler activity
tail -f logs/app.log | grep -i "auto"
```

---

## **🎯 Summary**

Your Netflix Code Bot now has **3 levels of automation**:

1. **Manual with Auto-Send**: `?autoSend=true`
2. **One-Click Auto**: `/auto-fetch-and-send`
3. **Fully Automatic**: Scheduled checker

**Perfect for hands-free Netflix code sharing!** 🚀 