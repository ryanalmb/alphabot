const serverless = require('serverless-http');

// Import the main app
const app = require('./app');

// Export the Lambda handler
module.exports.handler = serverless(app);

// Health check for Lambda
module.exports.health = async (event, context) => {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            status: 'healthy',
            service: 'Alpha Pack Pro Enterprise',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'production',
            features: [
                'Solana Integration',
                'Ethereum Support', 
                'Base Network',
                'Arbitrum Support',
                'Telegram Bot',
                'ML/AI Capabilities',
                'Trading APIs',
                'Security Stack',
                'Multi-Database',
                'Payment Integration',
                'Enterprise Ready'
            ]
        })
    };
};
