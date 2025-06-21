const coinGeckoAPI = require('./coingecko-api');
const arbitrageDetector = require('./arbitrage-detector');
const mlService = require('./ml-service');
const defiProtocols = require('./defi-protocols');

class TradingSignalsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
    
    this.signalWeights = {
      technical: 0.25,
      sentiment: 0.20,
      arbitrage: 0.25,
      ml_prediction: 0.30
    };
  }

  async generateComprehensiveSignals(symbols = ['solana', 'ethereum', 'bitcoin']) {
    const cacheKey = `comprehensive_signals_${symbols.join('_')}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const signals = await Promise.all(
        symbols.map(symbol => this.generateSignalForSymbol(symbol))
      );

      const result = {
        signals: signals,
        market_overview: await this.getMarketOverview(),
        top_opportunities: this.rankOpportunities(signals),
        risk_assessment: await this.getOverallRiskAssessment(signals),
        timestamp: Date.now()
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error('Error generating comprehensive signals:', error);
      return this.getMockComprehensiveSignals(symbols);
    }
  }

  async generateSignalForSymbol(symbol) {
    try {
      // Get market data
      const marketData = await coinGeckoAPI.getCurrentPrices([symbol]);
      const coinData = marketData[symbol];
      
      if (!coinData) {
        throw new Error(`No market data for ${symbol}`);
      }

      // Get arbitrage opportunities
      const arbitrageOpps = await arbitrageDetector.detectArbitrageOpportunities();
      const symbolArbitrage = arbitrageOpps.find(opp => 
        opp.coin.toLowerCase().includes(symbol) || 
        opp.symbol.toLowerCase().includes(this.getSymbolFromCoinId(symbol))
      );

      // Get ML predictions
      const mlSignal = await mlService.generateTradingSignals(symbol, {
        currentPrice: coinData.usd,
        volume24h: coinData.usd_24h_vol,
        marketCap: coinData.usd_market_cap,
        priceChange24h: coinData.usd_24h_change
      });

      // Get DeFi protocol data
      const protocolPrices = await defiProtocols.getAllProtocolPrices([this.getSymbolFromCoinId(symbol)]);

      // Calculate technical indicators
      const technicalSignal = this.calculateTechnicalSignal(coinData);

      // Combine all signals
      const combinedSignal = this.combineSignals({
        technical: technicalSignal,
        arbitrage: symbolArbitrage,
        ml: mlSignal,
        protocols: protocolPrices
      });

      return {
        symbol: symbol,
        display_symbol: this.getSymbolFromCoinId(symbol),
        current_price: coinData.usd,
        price_change_24h: coinData.usd_24h_change,
        volume_24h: coinData.usd_24h_vol,
        market_cap: coinData.usd_market_cap,
        signal: combinedSignal.action,
        confidence: combinedSignal.confidence,
        score: combinedSignal.score,
        entry_price: combinedSignal.entryPrice,
        stop_loss: combinedSignal.stopLoss,
        take_profit: combinedSignal.takeProfit,
        risk_level: combinedSignal.riskLevel,
        timeframe: '1h',
        reasoning: combinedSignal.reasoning,
        arbitrage_opportunity: symbolArbitrage,
        ml_prediction: mlSignal,
        technical_indicators: technicalSignal,
        protocol_analysis: this.analyzeProtocolPrices(protocolPrices),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error generating signal for ${symbol}:`, error);
      return this.getMockSignal(symbol);
    }
  }

  calculateTechnicalSignal(coinData) {
    const priceChange = coinData.usd_24h_change || 0;
    const volume = coinData.usd_24h_vol || 0;
    
    // Simple technical analysis
    let signal = 'HOLD';
    let strength = 0.5;
    let reasoning = [];

    // Price momentum
    if (priceChange > 5) {
      signal = 'BUY';
      strength += 0.2;
      reasoning.push('Strong upward momentum');
    } else if (priceChange < -5) {
      signal = 'SELL';
      strength += 0.2;
      reasoning.push('Strong downward momentum');
    }

    // Volume analysis
    if (volume > 1000000000) { // High volume
      strength += 0.1;
      reasoning.push('High trading volume');
    }

    // RSI simulation (mock)
    const mockRSI = 50 + (priceChange * 2);
    if (mockRSI < 30) {
      signal = 'BUY';
      strength += 0.15;
      reasoning.push('Oversold condition');
    } else if (mockRSI > 70) {
      signal = 'SELL';
      strength += 0.15;
      reasoning.push('Overbought condition');
    }

    return {
      signal,
      strength: Math.min(strength, 1),
      rsi: mockRSI,
      momentum: priceChange,
      volume_score: volume > 500000000 ? 'HIGH' : volume > 100000000 ? 'MEDIUM' : 'LOW',
      reasoning: reasoning.join(', ')
    };
  }

  combineSignals(signals) {
    const { technical, arbitrage, ml, protocols } = signals;
    
    let score = 0;
    let confidence = 0;
    let reasoning = [];

    // Technical analysis weight
    if (technical.signal === 'BUY') {
      score += this.signalWeights.technical * technical.strength;
      reasoning.push(`Technical: ${technical.reasoning}`);
    } else if (technical.signal === 'SELL') {
      score -= this.signalWeights.technical * technical.strength;
      reasoning.push(`Technical: ${technical.reasoning}`);
    }

    // Arbitrage opportunity weight
    if (arbitrage && arbitrage.profitPercentage > 0.1) {
      score += this.signalWeights.arbitrage * (arbitrage.profitPercentage / 10);
      reasoning.push(`Arbitrage: ${arbitrage.profitPercentage.toFixed(2)}% opportunity`);
    }

    // ML prediction weight
    if (ml.signal === 'BUY') {
      score += this.signalWeights.ml_prediction * ml.confidence;
      reasoning.push(`ML: ${ml.reasoning}`);
    } else if (ml.signal === 'SELL') {
      score -= this.signalWeights.ml_prediction * ml.confidence;
      reasoning.push(`ML: ${ml.reasoning}`);
    }

    // Protocol analysis weight
    const protocolScore = this.calculateProtocolScore(protocols);
    score += this.signalWeights.sentiment * protocolScore;

    // Determine final signal
    let action = 'HOLD';
    if (score > 0.3) {
      action = 'BUY';
    } else if (score < -0.3) {
      action = 'SELL';
    }

    confidence = Math.min(Math.abs(score), 1);

    return {
      action,
      confidence,
      score,
      entryPrice: ml.price_target,
      stopLoss: ml.stop_loss,
      takeProfit: ml.take_profit,
      riskLevel: ml.risk_score > 70 ? 'HIGH' : ml.risk_score > 40 ? 'MEDIUM' : 'LOW',
      reasoning: reasoning.join(' | ')
    };
  }

  calculateProtocolScore(protocolPrices) {
    // Analyze price differences across protocols
    const prices = [];
    for (const protocol of Object.values(protocolPrices)) {
      for (const price of Object.values(protocol)) {
        if (typeof price === 'number') {
          prices.push(price);
        }
      }
    }

    if (prices.length < 2) return 0;

    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    
    // Higher variance indicates more arbitrage opportunities
    return Math.min(variance / avgPrice, 0.1) * 10; // Normalize to 0-1
  }

  analyzeProtocolPrices(protocolPrices) {
    const analysis = {
      best_price: 0,
      worst_price: 0,
      best_protocol: '',
      worst_protocol: '',
      price_spread: 0,
      arbitrage_potential: false
    };

    let bestPrice = 0;
    let worstPrice = Infinity;

    for (const [protocol, prices] of Object.entries(protocolPrices)) {
      for (const [token, price] of Object.entries(prices)) {
        if (typeof price === 'number') {
          if (price > bestPrice) {
            bestPrice = price;
            analysis.best_protocol = protocol;
          }
          if (price < worstPrice) {
            worstPrice = price;
            analysis.worst_protocol = protocol;
          }
        }
      }
    }

    analysis.best_price = bestPrice;
    analysis.worst_price = worstPrice;
    analysis.price_spread = ((bestPrice - worstPrice) / worstPrice) * 100;
    analysis.arbitrage_potential = analysis.price_spread > 0.1;

    return analysis;
  }

  async getMarketOverview() {
    try {
      const marketData = await coinGeckoAPI.getCurrentPrices(['solana', 'ethereum', 'bitcoin']);
      
      let bullishCount = 0;
      let bearishCount = 0;
      let totalVolume = 0;

      for (const [symbol, data] of Object.entries(marketData)) {
        if (data.usd_24h_change > 0) bullishCount++;
        else bearishCount++;
        totalVolume += data.usd_24h_vol || 0;
      }

      const sentiment = bullishCount > bearishCount ? 'BULLISH' : 
                       bearishCount > bullishCount ? 'BEARISH' : 'NEUTRAL';

      return {
        market_sentiment: sentiment,
        bullish_coins: bullishCount,
        bearish_coins: bearishCount,
        total_volume_24h: totalVolume,
        fear_greed_index: 50 + (bullishCount - bearishCount) * 10, // Mock index
        volatility: 'MEDIUM' // Mock volatility
      };
    } catch (error) {
      console.error('Error getting market overview:', error);
      return {
        market_sentiment: 'NEUTRAL',
        bullish_coins: 1,
        bearish_coins: 1,
        total_volume_24h: 50000000000,
        fear_greed_index: 50,
        volatility: 'MEDIUM'
      };
    }
  }

  async getOverallRiskAssessment(signals) {
    const riskScores = signals.map(s => s.ml_prediction?.risk_score || 50);
    const avgRisk = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
    
    return {
      overall_risk: avgRisk,
      risk_level: avgRisk > 70 ? 'HIGH' : avgRisk > 40 ? 'MEDIUM' : 'LOW',
      portfolio_var: avgRisk * 100, // Mock VaR
      max_drawdown: avgRisk * 150, // Mock max drawdown
      recommendation: avgRisk > 70 ? 'Reduce position sizes' : 
                     avgRisk > 40 ? 'Maintain current strategy' : 'Consider increasing exposure'
    };
  }

  rankOpportunities(signals) {
    return signals
      .filter(s => s.signal !== 'HOLD')
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map((signal, index) => ({
        rank: index + 1,
        symbol: signal.display_symbol,
        action: signal.signal,
        confidence: signal.confidence,
        potential_return: signal.signal === 'BUY' ? 
          ((signal.take_profit - signal.current_price) / signal.current_price * 100) :
          ((signal.current_price - signal.entry_price) / signal.current_price * 100),
        risk_reward: signal.risk_level
      }));
  }

  getSymbolFromCoinId(coinId) {
    const mapping = {
      'solana': 'SOL',
      'ethereum': 'ETH',
      'bitcoin': 'BTC',
      'cardano': 'ADA',
      'polkadot': 'DOT'
    };
    return mapping[coinId] || coinId.toUpperCase();
  }

  getMockSignal(symbol) {
    const actions = ['BUY', 'SELL', 'HOLD'];
    return {
      symbol: symbol,
      display_symbol: this.getSymbolFromCoinId(symbol),
      current_price: 150,
      signal: actions[Math.floor(Math.random() * actions.length)],
      confidence: 0.6 + Math.random() * 0.3,
      score: (Math.random() - 0.5) * 2,
      reasoning: 'Mock signal for testing',
      timestamp: Date.now()
    };
  }

  getMockComprehensiveSignals(symbols) {
    return {
      signals: symbols.map(symbol => this.getMockSignal(symbol)),
      market_overview: {
        market_sentiment: 'NEUTRAL',
        bullish_coins: 1,
        bearish_coins: 1,
        total_volume_24h: 50000000000,
        fear_greed_index: 50,
        volatility: 'MEDIUM'
      },
      top_opportunities: [],
      risk_assessment: {
        overall_risk: 50,
        risk_level: 'MEDIUM',
        recommendation: 'Maintain current strategy'
      },
      timestamp: Date.now()
    };
  }
}

module.exports = new TradingSignalsService();
