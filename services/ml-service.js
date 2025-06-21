const { SageMakerClient } = require('@aws-sdk/client-sagemaker');
const { SageMakerRuntimeClient, InvokeEndpointCommand } = require('@aws-sdk/client-sagemaker-runtime');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const axios = require('axios');

class MLService {
  constructor() {
    // Configure AWS services
    this.sagemaker = new SageMakerClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.sagemakerRuntime = new SageMakerRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    // Model endpoints
    this.endpoints = {
      pricePredictor: process.env.SAGEMAKER_PRICE_ENDPOINT || 'alpha-pack-price-predictor',
      sentimentAnalyzer: process.env.SAGEMAKER_SENTIMENT_ENDPOINT || 'alpha-pack-sentiment-analyzer',
      riskAssessment: process.env.SAGEMAKER_RISK_ENDPOINT || 'alpha-pack-risk-assessment'
    };
    
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute for ML predictions
  }

  async predictPrice(symbol, timeframe = '1h', features = {}) {
    const cacheKey = `price_prediction_${symbol}_${timeframe}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Prepare input data for the model
      const inputData = {
        symbol: symbol,
        timeframe: timeframe,
        current_price: features.currentPrice || 0,
        volume_24h: features.volume24h || 0,
        market_cap: features.marketCap || 0,
        price_change_24h: features.priceChange24h || 0,
        rsi: features.rsi || 50,
        macd: features.macd || 0,
        bollinger_position: features.bollingerPosition || 0.5,
        sentiment_score: features.sentimentScore || 0,
        timestamp: Date.now()
      };

      // Try SageMaker first
      try {
        const prediction = await this.invokeSageMakerEndpoint(
          this.endpoints.pricePredictor,
          inputData
        );
        
        this.cache.set(cacheKey, { data: prediction, timestamp: Date.now() });
        return prediction;
      } catch (sagemakerError) {
        console.log('SageMaker unavailable, using local ML model fallback');
        return await this.localPricePrediction(inputData);
      }
    } catch (error) {
      console.error('Error in price prediction:', error);
      return this.getMockPrediction(symbol);
    }
  }

  async analyzeSentiment(text, sources = ['twitter', 'reddit', 'news']) {
    const cacheKey = `sentiment_${Buffer.from(text).toString('base64').slice(0, 20)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Try Bedrock first for sentiment analysis
      try {
        const sentiment = await this.invokeBedrockModel(text, 'sentiment');
        this.cache.set(cacheKey, { data: sentiment, timestamp: Date.now() });
        return sentiment;
      } catch (bedrockError) {
        console.log('Bedrock unavailable, using SageMaker fallback');
        
        const inputData = {
          text: text,
          sources: sources,
          timestamp: Date.now()
        };
        
        const sentiment = await this.invokeSageMakerEndpoint(
          this.endpoints.sentimentAnalyzer,
          inputData
        );
        
        this.cache.set(cacheKey, { data: sentiment, timestamp: Date.now() });
        return sentiment;
      }
    } catch (error) {
      console.error('Error in sentiment analysis:', error);
      return this.getMockSentiment();
    }
  }

  async assessRisk(portfolio, marketConditions = {}) {
    try {
      const inputData = {
        portfolio: portfolio,
        market_volatility: marketConditions.volatility || 0.2,
        correlation_matrix: marketConditions.correlations || {},
        var_confidence: 0.95,
        time_horizon: marketConditions.timeHorizon || 24, // hours
        timestamp: Date.now()
      };

      try {
        return await this.invokeSageMakerEndpoint(
          this.endpoints.riskAssessment,
          inputData
        );
      } catch (sagemakerError) {
        console.log('SageMaker unavailable, using local risk model fallback');
        return await this.localRiskAssessment(inputData);
      }
    } catch (error) {
      console.error('Error in risk assessment:', error);
      return this.getMockRiskAssessment();
    }
  }

  async generateTradingSignals(symbol, marketData) {
    try {
      // Combine multiple ML models for trading signals
      const [pricePredict, sentiment, risk] = await Promise.all([
        this.predictPrice(symbol, '1h', marketData),
        this.analyzeSentiment(`${symbol} cryptocurrency trading analysis`),
        this.assessRisk({ [symbol]: marketData.currentPrice || 100 })
      ]);

      const signal = this.combinePredictions(pricePredict, sentiment, risk);
      
      return {
        symbol: symbol,
        signal: signal.action, // 'BUY', 'SELL', 'HOLD'
        confidence: signal.confidence,
        price_target: pricePredict.predicted_price,
        stop_loss: signal.stopLoss,
        take_profit: signal.takeProfit,
        risk_score: risk.risk_score,
        sentiment_score: sentiment.score,
        reasoning: signal.reasoning,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error generating trading signals:', error);
      return this.getMockTradingSignal(symbol);
    }
  }

  async invokeSageMakerEndpoint(endpointName, inputData) {
    const params = {
      EndpointName: endpointName,
      ContentType: 'application/json',
      Body: JSON.stringify(inputData)
    };

    const response = await this.sagemakerRuntime.invokeEndpoint(params).promise();
    return JSON.parse(response.Body.toString());
  }

  async invokeBedrockModel(text, task = 'sentiment') {
    const modelId = 'anthropic.claude-v2';
    
    const prompt = task === 'sentiment' 
      ? `Analyze the sentiment of this text about cryptocurrency: "${text}". Return a JSON object with score (-1 to 1), label (positive/negative/neutral), and confidence (0 to 1).`
      : text;

    const params = {
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt: prompt,
        max_tokens_to_sample: 200,
        temperature: 0.1
      })
    };

    const response = await this.bedrock.invokeModel(params).promise();
    const responseBody = JSON.parse(response.body.toString());
    
    // Parse the response to extract sentiment data
    try {
      const sentimentData = JSON.parse(responseBody.completion);
      return {
        score: sentimentData.score || 0,
        label: sentimentData.label || 'neutral',
        confidence: sentimentData.confidence || 0.5,
        source: 'bedrock'
      };
    } catch (parseError) {
      return {
        score: 0,
        label: 'neutral',
        confidence: 0.5,
        source: 'bedrock_fallback'
      };
    }
  }

  async localPricePrediction(inputData) {
    // Simple local ML model fallback using technical indicators
    const { current_price, rsi, macd, price_change_24h } = inputData;
    
    // Simple prediction based on technical indicators
    let prediction = current_price;
    let confidence = 0.6;
    
    if (rsi < 30 && macd > 0) {
      prediction *= 1.02; // 2% increase
      confidence = 0.75;
    } else if (rsi > 70 && macd < 0) {
      prediction *= 0.98; // 2% decrease
      confidence = 0.75;
    } else {
      prediction *= (1 + (price_change_24h / 100) * 0.1); // Momentum factor
    }
    
    return {
      predicted_price: prediction,
      confidence: confidence,
      model: 'local_technical',
      timeframe: inputData.timeframe,
      timestamp: Date.now()
    };
  }

  async localRiskAssessment(inputData) {
    const { portfolio, market_volatility } = inputData;
    
    // Simple risk calculation
    const portfolioValue = Object.values(portfolio).reduce((sum, value) => sum + value, 0);
    const riskScore = Math.min(market_volatility * 100, 100);
    
    return {
      risk_score: riskScore,
      var_95: portfolioValue * market_volatility * 2.33, // 95% VaR
      max_drawdown: portfolioValue * market_volatility * 3,
      risk_level: riskScore < 30 ? 'LOW' : riskScore < 70 ? 'MEDIUM' : 'HIGH',
      model: 'local_risk',
      timestamp: Date.now()
    };
  }

  combinePredictions(pricePredict, sentiment, risk) {
    const priceDirection = pricePredict.predicted_price > pricePredict.current_price ? 1 : -1;
    const sentimentWeight = sentiment.score;
    const riskWeight = 1 - (risk.risk_score / 100);
    
    const combinedScore = (priceDirection * 0.4) + (sentimentWeight * 0.3) + (riskWeight * 0.3);
    
    let action = 'HOLD';
    let confidence = 0.5;
    
    if (combinedScore > 0.2) {
      action = 'BUY';
      confidence = Math.min(combinedScore, 0.9);
    } else if (combinedScore < -0.2) {
      action = 'SELL';
      confidence = Math.min(Math.abs(combinedScore), 0.9);
    }
    
    return {
      action,
      confidence,
      stopLoss: pricePredict.predicted_price * 0.95,
      takeProfit: pricePredict.predicted_price * 1.05,
      reasoning: `Price: ${priceDirection > 0 ? 'UP' : 'DOWN'}, Sentiment: ${sentiment.label}, Risk: ${risk.risk_level}`
    };
  }

  getMockPrediction(symbol) {
    return {
      predicted_price: 150 * (0.95 + Math.random() * 0.1),
      confidence: 0.65,
      model: 'mock',
      timeframe: '1h',
      timestamp: Date.now()
    };
  }

  getMockSentiment() {
    return {
      score: (Math.random() - 0.5) * 2,
      label: ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)],
      confidence: 0.6 + Math.random() * 0.3,
      source: 'mock'
    };
  }

  getMockRiskAssessment() {
    return {
      risk_score: 20 + Math.random() * 60,
      var_95: 1000 + Math.random() * 500,
      max_drawdown: 2000 + Math.random() * 1000,
      risk_level: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
      model: 'mock',
      timestamp: Date.now()
    };
  }

  getMockTradingSignal(symbol) {
    const actions = ['BUY', 'SELL', 'HOLD'];
    return {
      symbol: symbol,
      signal: actions[Math.floor(Math.random() * actions.length)],
      confidence: 0.6 + Math.random() * 0.3,
      price_target: 150 * (0.95 + Math.random() * 0.1),
      stop_loss: 140,
      take_profit: 160,
      risk_score: 30 + Math.random() * 40,
      sentiment_score: (Math.random() - 0.5) * 2,
      reasoning: 'Mock trading signal for testing',
      timestamp: Date.now()
    };
  }
}

module.exports = new MLService();
