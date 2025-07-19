// Global variables
let whatsappReady = false;
let latestCode = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    checkWhatsAppStatus();
    // Auto-load QR code on startup
    setTimeout(() => {
        loadQRCode();
    }, 1000);
});

// Check WhatsApp connection status
async function checkWhatsAppStatus() {
    try {
        const response = await fetch('/status');
        const data = await response.json();
        
        updateWhatsAppStatus(data.ready);
        whatsappReady = data.ready;
        
        if (data.ready) {
            document.getElementById('sendBtn').disabled = false;
        }
    } catch (error) {
        console.error('Error checking WhatsApp status:', error);
        updateWhatsAppStatus(false);
    }
}

// Update WhatsApp status display
function updateWhatsAppStatus(ready) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const sendBtn = document.getElementById('sendBtn');
    
    // Update right column status
    const statusDotRight = document.querySelector('#whatsappStatusRight .status-dot');
    const statusTextRight = document.querySelector('#whatsappStatusRight .status-text');
    
    if (ready) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Connected to WhatsApp';
        statusDotRight.className = 'status-dot connected';
        statusTextRight.textContent = 'Connected to WhatsApp';
        sendBtn.disabled = false;
        
        // Hide QR code when connected
        document.querySelector('.qr-code-display').innerHTML = `
            <div class="qr-placeholder">
                <span class="qr-icon">✅</span>
                <p>WhatsApp Connected!</p>
            </div>
        `;
    } else {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Not connected to WhatsApp';
        statusDotRight.className = 'status-dot disconnected';
        statusTextRight.textContent = 'Not connected to WhatsApp';
        sendBtn.disabled = true;
        
        // Show QR code when not connected
        loadQRCode();
    }
}

// Fetch the latest Netflix code
async function fetchCode() {
    const fetchBtn = document.getElementById('fetchBtn');
    const result = document.getElementById('result');
    
    // Show loading state
    fetchBtn.innerHTML = '<span class="loading"></span>Fetching...';
    fetchBtn.disabled = true;
    
    try {
        const response = await fetch('/fetch-latest-code');
        const data = await response.json();
        
        if (data.success) {
            latestCode = data.code;
            let message = `Latest Netflix code found!`;
            
            // Add WhatsApp status to message
            if (data.whatsappSent) {
                message += ` ✅ Sent to WhatsApp`;
            } else if (data.whatsappError) {
                message += ` ⚠️ WhatsApp: ${data.whatsappError}`;
            }
            
            showResult('success', message, latestCode);
        } else {
            showResult('error', data.error || 'No code found');
        }
    } catch (error) {
        console.error('Error fetching code:', error);
        showResult('error', 'Failed to fetch code. Please try again.');
    } finally {
        // Reset button state
        fetchBtn.innerHTML = '<span class="btn-icon">🔍</span>Get Latest Code';
        fetchBtn.disabled = false;
    }
}

// Send code to WhatsApp
async function sendToWhatsApp() {
    if (!latestCode) {
        showResult('error', 'Please fetch a code first');
        return;
    }
    
    if (!whatsappReady) {
        // Show QR code for connection
        showQRCode();
        return;
    }
    
    const sendBtn = document.getElementById('sendBtn');
    
    // Show loading state
    sendBtn.innerHTML = '<span class="loading"></span>Sending...';
    sendBtn.disabled = true;
    
    try {
        const response = await fetch('/send-to-whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: latestCode })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showResult('success', 'Code sent to WhatsApp successfully!');
        } else {
            showResult('error', data.error || 'Failed to send to WhatsApp');
        }
    } catch (error) {
        console.error('Error sending to WhatsApp:', error);
        showResult('error', 'Failed to send to WhatsApp. Please try again.');
    } finally {
        // Reset button state
        sendBtn.innerHTML = '<span class="btn-icon">📤</span>Send to WhatsApp';
        sendBtn.disabled = false;
    }
}

// Load QR code automatically
async function loadQRCode() {
    // Only poll if not connected
    if (whatsappReady) return;
    try {
        const response = await fetch('/whatsapp-qr');
        const qrCode = document.getElementById('qrCode');
        if (response.status === 404) {
            const errorData = await response.json();
            // Only show QR code placeholder if not connected
            if (!whatsappReady) {
                qrCode.innerHTML = `
                    <div class="qr-placeholder">
                        <span class="qr-icon">⏳</span>
                        <p>${errorData.error || 'Waiting for QR code...'}</p>
                    </div>
                `;
                setTimeout(loadQRCode, 5000);
            }
            return;
        }
        const data = await response.json();
        if (data.qrCode) {
            // Generate QR code
            const qr = qrcode(0, 'M');
            qr.addData(data.qrCode);
            qr.make();
            qrCode.innerHTML = qr.createImgTag(5);
            pollWhatsAppStatus();
        } else {
            // Only show this if not connected
            if (!whatsappReady) {
                qrCode.innerHTML = `
                    <div class="qr-placeholder">
                        <span class="qr-icon">❌</span>
                        <p>No QR code data received</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error getting QR code:', error);
        const qrCode = document.getElementById('qrCode');
        // Only show this if not connected
        if (!whatsappReady) {
            qrCode.innerHTML = `
                <div class="qr-placeholder">
                    <span class="qr-icon">❌</span>
                    <p>Failed to load QR code</p>
                </div>
            `;
            setTimeout(loadQRCode, 5000);
        }
    }
}

// Show QR code for WhatsApp connection (legacy function)
async function showQRCode() {
    loadQRCode();
}

// Poll WhatsApp connection status
function pollWhatsAppStatus() {
    let pollCount = 0;
    const maxPolls = 30; // 1 minute max (30 * 2 seconds)
    
    const interval = setInterval(async () => {
        pollCount++;
        
        try {
            const response = await fetch('/status');
            const data = await response.json();
            
            if (data.ready) {
                clearInterval(interval);
                whatsappReady = true;
                updateWhatsAppStatus(true);
                
                // Auto-send the code if we have one
                if (latestCode) {
                    sendToWhatsApp();
                }
            } else if (pollCount >= maxPolls) {
                // Stop polling after max attempts
                clearInterval(interval);
                console.log('Stopped polling - max attempts reached');
            }
        } catch (error) {
            console.error('Error polling WhatsApp status:', error);
            if (pollCount >= maxPolls) {
                clearInterval(interval);
            }
        }
    }, 2000); // Check every 2 seconds
}

// Show result message
function showResult(type, message, code = null) {
    const result = document.getElementById('result');
    
    let html = `<div class="${type}">${message}</div>`;
    
    if (code) {
        html += `<div class="code-display">${code}</div>`;
    }
    
    result.innerHTML = html;
    result.style.display = 'block';
} 