// Alpha Pack Simple Telegram Bot
// This bot uses polling instead of webhooks for immediate testing

const https = require('https');

const BOT_TOKEN = '7847029671:AAEk8V6GxFdn8eba5xumX_GHUPnkkexG91M';
let lastUpdateId = 0;

console.log('🚀 Starting Alpha Pack Telegram Bot...');
console.log('🤖 Bot Token:', BOT_TOKEN.substring(0, 10) + '...');

// Function to make API calls to Telegram
function telegramAPI(method, data = {}) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/${method}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Function to send a message
async function sendMessage(chatId, text, options = {}) {
    try {
        const result = await telegramAPI('sendMessage', {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
            ...options
        });
        
        if (result.ok) {
            console.log('✅ Message sent successfully');
        } else {
            console.log('❌ Failed to send message:', result.description);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Error sending message:', error);
    }
}

// Function to handle incoming messages
function handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text || '';
    const firstName = message.from.first_name || 'User';
    
    console.log(`💬 Message from ${firstName}: ${text}`);
    
    // Handle different commands
    if (text.startsWith('/start')) {
        const welcomeMessage = `🐺 **Welcome to Alpha Pack!** 🚀

Hello ${firstName}! You've just joined the most elite DeFi social trading ecosystem.

**🎯 What is Alpha Pack?**
• Pack vs Pack competition system
• AI-powered arbitrage detection
• Cross-chain trading (Solana, Ethereum, Base, Arbitrum)
• Social rewards for viral content
• Real-time pack battles

**📱 Available Commands:**
/pack - Join or create a pack
/trade - Start trading
/compete - Enter competitions
/social - Social features
/stats - Your statistics
/help - Get help

**🚀 Ready to dominate DeFi?**
Choose your pack and let's start trading! 💎

*Alpha Pack - Where Alphas Unite* 🐺`;

        sendMessage(chatId, welcomeMessage);
        
    } else if (text.startsWith('/pack')) {
        const packMessage = `🐺 **Pack Management** 🐺

**Your Pack Status:** Not in a pack

**Available Actions:**
• 🆕 Create new pack
• 🔍 Browse existing packs
• 👥 Join a pack
• 🏆 View pack leaderboard

**Top Packs:**
1. 🥇 Alpha Wolves - 1,250 points
2. 🥈 DeFi Hunters - 1,180 points  
3. 🥉 Solana Sharks - 1,050 points

Ready to join the hunt? 🎯`;

        sendMessage(chatId, packMessage);
        
    } else if (text.startsWith('/trade')) {
        const tradeMessage = `💹 **Trading Dashboard** 💹

**AI Arbitrage Opportunities:**
🔥 SOL/USDC: 1.2% profit (Solana → Ethereum)
⚡ ETH/USDC: 0.8% profit (Base → Arbitrum)
🚀 BTC/USDC: 0.6% profit (Ethereum → Base)

**Your Trading Stats:**
• Total Trades: 0
• Win Rate: 0%
• Total Profit: $0.00
• Pack Rank: Unranked

**Quick Actions:**
• 🎯 Execute arbitrage
• 📊 View market analysis
• 📈 Trading history
• ⚙️ Settings

*AI-powered trading at your fingertips!* 🤖`;

        sendMessage(chatId, tradeMessage);
        
    } else if (text.startsWith('/compete')) {
        const competeMessage = `🏆 **Pack Competitions** 🏆

**Active Competitions:**
🔥 **Weekly Pack Battle**
• Prize Pool: $10,000 USDC
• Ends in: 3 days, 14 hours
• Your Pack: Not participating

⚡ **Arbitrage Challenge**
• Prize Pool: $5,000 USDC
• Ends in: 1 day, 8 hours
• Top Trader Wins All

🚀 **Social Viral Contest**
• Prize Pool: $2,500 USDC
• Most viral content wins
• Ends in: 5 days

**Join a pack to participate!** 🐺`;

        sendMessage(chatId, competeMessage);
        
    } else if (text.startsWith('/social')) {
        const socialMessage = `📱 **Social Features** 📱

**Viral Content Engine:**
• 🐦 Auto-post to Twitter
• 📺 TikTok integration
• 💬 Discord announcements
• 📸 Instagram stories

**Your Social Stats:**
• Viral Score: 0
• Total Reach: 0
• Engagement Rate: 0%
• Rewards Earned: $0.00

**Create Content:**
• 📝 Trading insights
• 🎯 Market predictions
• 🏆 Pack achievements
• 💎 Success stories

*Go viral, earn rewards!* 🚀`;

        sendMessage(chatId, socialMessage);
        
    } else if (text.startsWith('/stats')) {
        const statsMessage = `📊 **Your Alpha Pack Stats** 📊

**Trading Performance:**
• Total Trades: 0
• Win Rate: 0%
• Total Profit: $0.00
• Best Trade: N/A

**Pack Status:**
• Current Pack: None
• Pack Rank: Unranked
• Pack Points: 0
• Pack Level: Newcomer

**Social Impact:**
• Viral Score: 0
• Content Created: 0
• Followers Gained: 0
• Rewards Earned: $0.00

**Achievements:** 🏆
None yet - start trading to unlock!

*Time to make your mark!* 💪`;

        sendMessage(chatId, statsMessage);
        
    } else if (text.startsWith('/help')) {
        const helpMessage = `❓ **Alpha Pack Help** ❓

**Getting Started:**
1. Join or create a pack (/pack)
2. Start trading (/trade)
3. Compete with other packs (/compete)
4. Create viral content (/social)

**Key Features:**
• 🤖 AI-powered arbitrage detection
• 🐺 Pack vs pack competition
• 🌐 Cross-chain trading
• 📱 Social media integration
• 🏆 Real-time leaderboards

**Support:**
• 📧 Email: support@alphapack.io
• 💬 Discord: discord.gg/alphapack
• 🐦 Twitter: @AlphaPackDeFi

**Need help?** Just ask! 💬`;

        sendMessage(chatId, helpMessage);
        
    } else {
        // Default response for any other message
        const defaultMessage = `🤖 **Alpha Pack Bot** 🤖

I received your message: "${text}"

**Available Commands:**
/start - Welcome & overview
/pack - Pack management
/trade - Trading dashboard  
/compete - Competitions
/social - Social features
/stats - Your statistics
/help - Get help

*Ready to dominate DeFi?* 🚀`;

        sendMessage(chatId, defaultMessage);
    }
}

// Function to get updates from Telegram
async function getUpdates() {
    try {
        const result = await telegramAPI('getUpdates', {
            offset: lastUpdateId + 1,
            limit: 100,
            timeout: 30
        });
        
        if (result.ok && result.result.length > 0) {
            for (const update of result.result) {
                lastUpdateId = update.update_id;
                
                if (update.message) {
                    handleMessage(update.message);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error getting updates:', error);
    }
}

// Function to test bot connectivity
async function testBot() {
    try {
        console.log('🔍 Testing bot connectivity...');
        const result = await telegramAPI('getMe');
        
        if (result.ok) {
            console.log('✅ Bot is online!');
            console.log(`🤖 Bot name: ${result.result.first_name}`);
            console.log(`👤 Username: @${result.result.username}`);
            console.log('');
            console.log('🎯 Bot is ready to receive messages!');
            console.log('📱 Search for @Alpha_Pack_bot on Telegram');
            console.log('💬 Send /start to begin');
            console.log('');
            return true;
        } else {
            console.log('❌ Bot test failed:', result.description);
            return false;
        }
    } catch (error) {
        console.error('❌ Bot connectivity error:', error);
        return false;
    }
}

// Main function
async function main() {
    console.log('🚀 Alpha Pack Bot Starting...');
    
    // Test bot first
    const isOnline = await testBot();
    if (!isOnline) {
        console.log('❌ Bot is not accessible. Check token and network.');
        process.exit(1);
    }
    
    // Clear webhook to enable polling
    try {
        await telegramAPI('deleteWebhook');
        console.log('✅ Webhook cleared, polling mode enabled');
    } catch (error) {
        console.log('⚠️ Could not clear webhook:', error.message);
    }
    
    console.log('🔄 Starting message polling...');
    
    // Start polling for messages
    setInterval(getUpdates, 1000); // Poll every second
    
    console.log('');
    console.log('🎉 Alpha Pack Bot is now LIVE!');
    console.log('📱 Go to Telegram and message @Alpha_Pack_bot');
    console.log('💬 Send /start to test the bot');
    console.log('');
}

// Start the bot
main().catch(console.error);
