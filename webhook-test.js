const http = require('http');
const port = 3000;

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            console.log('🤖 Telegram webhook received:', body);
            
            // Parse the update
            try {
                const update = JSON.parse(body);
                console.log('📱 Update ID:', update.update_id);
                
                if (update.message) {
                    console.log('💬 Message from:', update.message.from.first_name);
                    console.log('📝 Text:', update.message.text);
                    
                    // Send a response back
                    const chatId = update.message.chat.id;
                    const responseText = `🐺 Alpha Pack Bot is LIVE! Welcome ${update.message.from.first_name}! 🚀\n\nAvailable commands:\n/start - Get started\n/pack - Join a pack\n/trade - Start trading\n/compete - Enter competition\n/social - Social features`;
                    
                    // Send response via Telegram API
                    const https = require('https');
                    const postData = JSON.stringify({
                        chat_id: chatId,
                        text: responseText,
                        parse_mode: 'Markdown'
                    });
                    
                    const options = {
                        hostname: 'api.telegram.org',
                        port: 443,
                        path: `/bot${process.env.BOT_TOKEN}/sendMessage`,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(postData)
                        }
                    };
                    
                    const apiReq = https.request(options, (apiRes) => {
                        console.log('✅ Response sent to Telegram');
                    });
                    
                    apiReq.on('error', (e) => {
                        console.error('❌ Error sending response:', e);
                    });
                    
                    apiReq.write(postData);
                    apiReq.end();
                }
            } catch (error) {
                console.error('❌ Error parsing update:', error);
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"ok":true}');
        });
    } else if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"status":"healthy","service":"Alpha Pack Webhook","timestamp":"' + new Date().toISOString() + '"}');
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end('{"error":"Not found"}');
    }
});

server.listen(port, () => {
    console.log(`🚀 Alpha Pack webhook server running on port ${port}`);
    console.log(`📡 Webhook URL: http://localhost:${port}/webhook`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    console.log('');
    console.log('🤖 To test the bot:');
    console.log('1. Set webhook: curl -X POST "https://api.telegram.org/bot' + process.env.BOT_TOKEN + '/setWebhook" -d "url=http://your-ngrok-url.ngrok.io/webhook"');
    console.log('2. Message your bot on Telegram');
    console.log('3. Watch the logs here');
    console.log('');
    console.log('💡 Use ngrok to expose this server: ngrok http 3000');
});
