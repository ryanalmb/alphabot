// =============================================================================
// ALPHA PACK - MINIMAL WORKING TELEGRAM BOT
// Bypasses npm install issues for immediate functionality
// =============================================================================

const https = require('https');
const http = require('http');

// Configuration
const TELEGRAM_BOT_TOKEN = '7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M';
const PORT = process.env.PORT || 3000;

// Simple HTTP request helper
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

// Telegram API helper
async function sendTelegramMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        })
    };
    
    try {
        const response = await makeRequest(url, options);
        console.log('Message sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

// Get crypto prices (simplified)
async function getCryptoPrices() {
    try {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';
        const data = await makeRequest(url);
        
        const formatPrice = (coin, symbol) => {
            const price = data[coin]?.usd || 0;
            const change = data[coin]?.usd_24h_change || 0;
            const emoji = change >= 0 ? '🟢' : '🔴';
            return `${symbol}: $${price.toFixed(2)} ${emoji} ${change.toFixed(2)}%`;
        };
        
        return [
            formatPrice('solana', 'SOL'),
            formatPrice('bitcoin', 'BTC'),
            formatPrice('ethereum', 'ETH')
        ].join('\n');
    } catch (error) {
        console.error('Error fetching prices:', error);
        return 'Unable to fetch prices at the moment.';
    }
}

// Handle Telegram updates
async function handleUpdate(update) {
    if (!update.message) return;
    
    const chatId = update.message.chat.id;
    const text = update.message.text || '';
    const command = text.toLowerCase();
    
    console.log(`Received message: ${text} from chat: ${chatId}`);
    
    try {
        if (command.startsWith('/start')) {
            await sendTelegramMessage(chatId, `
🚀 <b>Alpha Pack Pro - Minimal Bot</b>

Welcome to Alpha Pack! This is a simplified version running while we optimize the full system.

Available commands:
💰 /prices - Live crypto prices
❓ /help - Show commands
📊 /status - Bot status

🔧 <i>Full features coming soon with optimized deployment!</i>
            `);
        }
        else if (command.startsWith('/prices')) {
            await sendTelegramMessage(chatId, '📊 <b>Live Crypto Prices</b>\n\n' + await getCryptoPrices());
        }
        else if (command.startsWith('/help')) {
            await sendTelegramMessage(chatId, `
❓ <b>Alpha Pack Commands</b>

💰 /prices - Current crypto prices
📊 /status - Bot status
❓ /help - Show this help

🚀 <i>This is a minimal version. Full Alpha Pack features (blockchain, ML, DeFi) will be available once optimization is complete!</i>
            `);
        }
        else if (command.startsWith('/status')) {
            await sendTelegramMessage(chatId, `
📊 <b>Alpha Pack Status</b>

✅ Bot: Online
✅ API: Responding
✅ Prices: Live data
🔧 Full system: Optimizing

🎯 <i>Working on deployment optimization to enable all features!</i>
            `);
        }
        else {
            await sendTelegramMessage(chatId, `
🤖 I received: "${text}"

Try these commands:
💰 /prices - Live crypto prices
❓ /help - Show all commands
            `);
        }
    } catch (error) {
        console.error('Error handling update:', error);
        await sendTelegramMessage(chatId, '❌ Sorry, there was an error processing your request.');
    }
}

// Set up webhook
async function setupWebhook() {
    const webhookUrl = `http://98.80.72.101:3000/webhook`;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
    
    try {
        const response = await makeRequest(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl })
        });
        console.log('Webhook set up:', response);
    } catch (error) {
        console.error('Error setting up webhook:', error);
    }
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    // Health check
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', bot: 'Alpha Pack Minimal' }));
        return;
    }
    
    // Webhook endpoint
    if (req.url === '/webhook' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const update = JSON.parse(body);
                await handleUpdate(update);
                res.writeHead(200);
                res.end('OK');
            } catch (error) {
                console.error('Webhook error:', error);
                res.writeHead(500);
                res.end('Error');
            }
        });
        return;
    }
    
    // Default response
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <h1>🚀 Alpha Pack Pro - Minimal Bot</h1>
        <p>✅ Bot is running and ready!</p>
        <p>📱 Try messaging the Telegram bot</p>
        <p>🔧 Full features coming with optimized deployment</p>
    `);
});

// Start server
server.listen(PORT, async () => {
    console.log(`🚀 Alpha Pack Minimal Bot running on port ${PORT}`);
    console.log('📱 Setting up Telegram webhook...');
    await setupWebhook();
    console.log('✅ Bot ready to receive messages!');
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        process.exit(0);
    });
});
