/**
 * Free AI Alternatives for Alpha Pack
 * Replaces OpenAI with free services: Hugging Face, Ollama, and local models
 */

import axios from 'axios';
import logger from '../utils/logger';

// Free AI service configurations
const AI_SERVICES = {
  HUGGING_FACE: {
    baseUrl: 'https://api-inference.huggingface.co/models',
    models: {
      textGeneration: 'microsoft/DialoGPT-large',
      sentiment: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
      classification: 'facebook/bart-large-mnli',
      summarization: 'facebook/bart-large-cnn',
      translation: 'Helsinki-NLP/opus-mt-en-es',
    },
  },
  OLLAMA: {
    baseUrl: 'http://localhost:11434/api',
    models: {
      chat: 'llama2:7b',
      code: 'codellama:7b',
      embedding: 'nomic-embed-text',
    },
  },
  LOCAL_MODELS: {
    sentiment: 'rule-based',
    arbitrage: 'heuristic',
    social: 'engagement-based',
  },
};

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
  service: string;
  model: string;
}

export class FreeAIService {
  private huggingFaceToken: string | null;
  private ollamaAvailable: boolean = false;

  constructor() {
    this.huggingFaceToken = process.env.HUGGINGFACE_API_KEY || null;
    this.checkOllamaAvailability();
  }

  /**
   * Check if Ollama is running locally
   */
  private async checkOllamaAvailability(): Promise<void> {
    try {
      await axios.get(`${AI_SERVICES.OLLAMA.baseUrl}/tags`, { timeout: 2000 });
      this.ollamaAvailable = true;
      logger.info('Ollama service detected and available');
    } catch (error) {
      this.ollamaAvailable = false;
      logger.info('Ollama not available, using other free alternatives');
    }
  }

  /**
   * Generate trading insights and analysis
   */
  async generateTradingInsights(data: {
    tokenPair: string;
    priceData: number[];
    volume: number;
    marketCap: number;
  }): Promise<AIResponse> {
    try {
      // Try Ollama first if available
      if (this.ollamaAvailable) {
        return await this.ollamaAnalysis(data);
      }

      // Fallback to Hugging Face
      if (this.huggingFaceToken) {
        return await this.huggingFaceAnalysis(data);
      }

      // Final fallback to local heuristic analysis
      return this.localTradingAnalysis(data);
    } catch (error) {
      logger.error('AI trading insights failed:', error);
      return this.localTradingAnalysis(data);
    }
  }

  /**
   * Analyze social media content for virality potential
   */
  async analyzeSocialContent(content: string, platform: string): Promise<AIResponse> {
    try {
      // Try Hugging Face sentiment analysis
      if (this.huggingFaceToken) {
        const sentiment = await this.huggingFaceSentiment(content);
        const virality = this.calculateViralityScore(content, platform, sentiment.data);
        
        return {
          success: true,
          data: {
            sentiment: sentiment.data,
            viralityScore: virality,
            recommendations: this.generateSocialRecommendations(content, platform, virality),
          },
          service: 'huggingface',
          model: 'sentiment-analysis',
        };
      }

      // Fallback to local analysis
      return this.localSocialAnalysis(content, platform);
    } catch (error) {
      logger.error('Social content analysis failed:', error);
      return this.localSocialAnalysis(content, platform);
    }
  }

  /**
   * Generate arbitrage opportunities using free AI
   */
  async findArbitrageOpportunities(marketData: any[]): Promise<AIResponse> {
    try {
      // Use local heuristic model (most reliable for arbitrage)
      const opportunities = this.localArbitrageDetection(marketData);
      
      // Enhance with AI insights if available
      if (this.ollamaAvailable) {
        const aiInsights = await this.ollamaArbitrageAnalysis(opportunities);
        return {
          success: true,
          data: {
            opportunities,
            aiInsights: aiInsights.data,
          },
          service: 'ollama + local',
          model: 'hybrid',
        };
      }

      return {
        success: true,
        data: { opportunities },
        service: 'local',
        model: 'heuristic',
      };
    } catch (error) {
      logger.error('Arbitrage analysis failed:', error);
      return {
        success: false,
        error: error.message,
        service: 'local',
        model: 'fallback',
      };
    }
  }

  /**
   * Generate pack strategy recommendations
   */
  async generatePackStrategy(packData: {
    members: number;
    riskTolerance: string;
    tradingHistory: any[];
    goals: string[];
  }): Promise<AIResponse> {
    try {
      if (this.ollamaAvailable) {
        return await this.ollamaPackStrategy(packData);
      }

      return this.localPackStrategy(packData);
    } catch (error) {
      logger.error('Pack strategy generation failed:', error);
      return this.localPackStrategy(packData);
    }
  }

  // ============ HUGGING FACE IMPLEMENTATIONS ============

  private async huggingFaceAnalysis(data: any): Promise<AIResponse> {
    const prompt = `Analyze trading data for ${data.tokenPair}: Price trend, volume ${data.volume}, market cap ${data.marketCap}. Provide insights.`;
    
    const response = await axios.post(
      `${AI_SERVICES.HUGGING_FACE.baseUrl}/${AI_SERVICES.HUGGING_FACE.models.textGeneration}`,
      { inputs: prompt },
      {
        headers: {
          'Authorization': `Bearer ${this.huggingFaceToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return {
      success: true,
      data: response.data[0]?.generated_text || 'Analysis completed',
      service: 'huggingface',
      model: 'text-generation',
    };
  }

  private async huggingFaceSentiment(text: string): Promise<AIResponse> {
    const response = await axios.post(
      `${AI_SERVICES.HUGGING_FACE.baseUrl}/${AI_SERVICES.HUGGING_FACE.models.sentiment}`,
      { inputs: text },
      {
        headers: {
          'Authorization': `Bearer ${this.huggingFaceToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    return {
      success: true,
      data: response.data[0],
      service: 'huggingface',
      model: 'sentiment',
    };
  }

  // ============ OLLAMA IMPLEMENTATIONS ============

  private async ollamaAnalysis(data: any): Promise<AIResponse> {
    const prompt = `As a DeFi trading expert, analyze this data for ${data.tokenPair}:
    - Price data: ${data.priceData.slice(-5).join(', ')}
    - Volume: ${data.volume}
    - Market cap: ${data.marketCap}
    
    Provide: 1) Trend analysis 2) Risk assessment 3) Trading recommendation`;

    const response = await axios.post(
      `${AI_SERVICES.OLLAMA.baseUrl}/generate`,
      {
        model: AI_SERVICES.OLLAMA.models.chat,
        prompt,
        stream: false,
      },
      { timeout: 15000 }
    );

    return {
      success: true,
      data: response.data.response,
      service: 'ollama',
      model: 'llama2',
    };
  }

  private async ollamaPackStrategy(packData: any): Promise<AIResponse> {
    const prompt = `Create a DeFi trading strategy for a pack with:
    - ${packData.members} members
    - Risk tolerance: ${packData.riskTolerance}
    - Goals: ${packData.goals.join(', ')}
    
    Provide specific strategy recommendations.`;

    const response = await axios.post(
      `${AI_SERVICES.OLLAMA.baseUrl}/generate`,
      {
        model: AI_SERVICES.OLLAMA.models.chat,
        prompt,
        stream: false,
      },
      { timeout: 15000 }
    );

    return {
      success: true,
      data: response.data.response,
      service: 'ollama',
      model: 'llama2',
    };
  }

  private async ollamaArbitrageAnalysis(opportunities: any[]): Promise<AIResponse> {
    const prompt = `Analyze these arbitrage opportunities and rank by profitability and risk:
    ${JSON.stringify(opportunities.slice(0, 3), null, 2)}`;

    const response = await axios.post(
      `${AI_SERVICES.OLLAMA.baseUrl}/generate`,
      {
        model: AI_SERVICES.OLLAMA.models.chat,
        prompt,
        stream: false,
      },
      { timeout: 10000 }
    );

    return {
      success: true,
      data: response.data.response,
      service: 'ollama',
      model: 'llama2',
    };
  }

  // ============ LOCAL FALLBACK IMPLEMENTATIONS ============

  private localTradingAnalysis(data: any): AIResponse {
    const priceChange = data.priceData.length > 1 
      ? ((data.priceData[data.priceData.length - 1] - data.priceData[0]) / data.priceData[0]) * 100
      : 0;

    const trend = priceChange > 5 ? 'bullish' : priceChange < -5 ? 'bearish' : 'sideways';
    const volumeRating = data.volume > 1000000 ? 'high' : data.volume > 100000 ? 'medium' : 'low';

    return {
      success: true,
      data: {
        trend,
        priceChange: `${priceChange.toFixed(2)}%`,
        volumeRating,
        recommendation: this.getLocalRecommendation(trend, volumeRating),
        confidence: 0.75,
      },
      service: 'local',
      model: 'heuristic',
    };
  }

  private localSocialAnalysis(content: string, platform: string): AIResponse {
    const viralityScore = this.calculateViralityScore(content, platform);
    const sentiment = this.getLocalSentiment(content);

    return {
      success: true,
      data: {
        sentiment,
        viralityScore,
        recommendations: this.generateSocialRecommendations(content, platform, viralityScore),
      },
      service: 'local',
      model: 'rule-based',
    };
  }

  private localArbitrageDetection(marketData: any[]): any[] {
    const opportunities = [];
    
    for (let i = 0; i < marketData.length - 1; i++) {
      for (let j = i + 1; j < marketData.length; j++) {
        const exchange1 = marketData[i];
        const exchange2 = marketData[j];
        
        if (exchange1.token === exchange2.token) {
          const priceDiff = Math.abs(exchange1.price - exchange2.price);
          const profitPercent = (priceDiff / Math.min(exchange1.price, exchange2.price)) * 100;
          
          if (profitPercent > 0.5) { // Minimum 0.5% profit
            opportunities.push({
              token: exchange1.token,
              buyExchange: exchange1.price < exchange2.price ? exchange1.exchange : exchange2.exchange,
              sellExchange: exchange1.price < exchange2.price ? exchange2.exchange : exchange1.exchange,
              buyPrice: Math.min(exchange1.price, exchange2.price),
              sellPrice: Math.max(exchange1.price, exchange2.price),
              profitPercent: profitPercent.toFixed(2),
              estimatedProfit: priceDiff,
              confidence: Math.min(profitPercent * 10, 95),
            });
          }
        }
      }
    }

    return opportunities.sort((a, b) => parseFloat(b.profitPercent) - parseFloat(a.profitPercent));
  }

  private localPackStrategy(packData: any): AIResponse {
    const strategies = {
      low: 'Conservative DeFi yield farming with established protocols',
      medium: 'Balanced approach: 60% yield farming, 30% arbitrage, 10% speculation',
      high: 'Aggressive trading with leverage and new token opportunities',
    };

    return {
      success: true,
      data: {
        strategy: strategies[packData.riskTolerance] || strategies.medium,
        allocation: this.getAssetAllocation(packData.riskTolerance),
        recommendations: this.getStrategyRecommendations(packData),
      },
      service: 'local',
      model: 'rule-based',
    };
  }

  // ============ HELPER METHODS ============

  private calculateViralityScore(content: string, platform: string, sentiment?: any): number {
    let score = 50; // Base score

    // Content analysis
    const hasEmojis = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(content);
    const hasHashtags = /#\w+/.test(content);
    const hasNumbers = /\$\d+|\d+%|\d+x/.test(content);
    const hasCrypto = /bitcoin|btc|ethereum|eth|solana|sol|defi|nft/i.test(content);

    if (hasEmojis) score += 10;
    if (hasHashtags) score += 15;
    if (hasNumbers) score += 20;
    if (hasCrypto) score += 25;

    // Platform-specific adjustments
    const platformMultipliers = {
      twitter: 1.2,
      tiktok: 1.5,
      instagram: 1.1,
      discord: 0.9,
      telegram: 1.0,
    };

    score *= platformMultipliers[platform] || 1.0;

    // Sentiment adjustment
    if (sentiment?.label === 'POSITIVE') score += 10;
    if (sentiment?.label === 'NEGATIVE') score -= 5;

    return Math.min(Math.max(score, 0), 100);
  }

  private getLocalSentiment(text: string): any {
    const positiveWords = ['great', 'amazing', 'bullish', 'moon', 'profit', 'win', 'success', '🚀', '💎'];
    const negativeWords = ['bad', 'bearish', 'loss', 'dump', 'crash', 'fail', 'scam', '📉', '💸'];

    const positive = positiveWords.filter(word => text.toLowerCase().includes(word)).length;
    const negative = negativeWords.filter(word => text.toLowerCase().includes(word)).length;

    if (positive > negative) return { label: 'POSITIVE', score: 0.7 + (positive * 0.1) };
    if (negative > positive) return { label: 'NEGATIVE', score: 0.7 + (negative * 0.1) };
    return { label: 'NEUTRAL', score: 0.5 };
  }

  private getLocalRecommendation(trend: string, volumeRating: string): string {
    if (trend === 'bullish' && volumeRating === 'high') return 'Strong buy signal';
    if (trend === 'bearish' && volumeRating === 'high') return 'Consider selling';
    if (trend === 'sideways') return 'Hold and wait for breakout';
    return 'Monitor closely';
  }

  private generateSocialRecommendations(content: string, platform: string, viralityScore: number): string[] {
    const recommendations = [];
    
    if (viralityScore > 70) {
      recommendations.push('High viral potential - boost with paid promotion');
    }
    
    if (!/#\w+/.test(content)) {
      recommendations.push('Add trending hashtags for better reach');
    }
    
    if (platform === 'twitter' && content.length < 100) {
      recommendations.push('Consider adding more context or a thread');
    }
    
    if (platform === 'tiktok' && !/video|visual/.test(content)) {
      recommendations.push('Add visual elements or video content');
    }

    return recommendations;
  }

  private getAssetAllocation(riskTolerance: string): any {
    const allocations = {
      low: { stablecoins: 60, bluechip: 30, defi: 10, speculation: 0 },
      medium: { stablecoins: 30, bluechip: 40, defi: 20, speculation: 10 },
      high: { stablecoins: 10, bluechip: 20, defi: 40, speculation: 30 },
    };

    return allocations[riskTolerance] || allocations.medium;
  }

  private getStrategyRecommendations(packData: any): string[] {
    const recommendations = [];
    
    if (packData.members > 5) {
      recommendations.push('Implement role-based trading with specialists');
    }
    
    if (packData.goals.includes('arbitrage')) {
      recommendations.push('Set up automated arbitrage monitoring');
    }
    
    if (packData.goals.includes('social')) {
      recommendations.push('Create content calendar for viral marketing');
    }

    return recommendations;
  }
}

// Export singleton instance
export const freeAI = new FreeAIService();
export default freeAI;
