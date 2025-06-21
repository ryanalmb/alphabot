const axios = require('axios');

class CoinGeckoAPI {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
  }

  async makeRequest(endpoint) {
    const cacheKey = endpoint;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Alpha-Pack-Bot/1.0'
        }
      });

      const data = response.data;
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`CoinGecko API error for ${endpoint}:`, error.message);
      
      // Return cached data if available, even if expired
      if (cached) {
        console.log('Returning expired cached data due to API error');
        return cached.data;
      }
      
      throw new Error(`Failed to fetch data from CoinGecko: ${error.message}`);
    }
  }

  async getCurrentPrices(coinIds = ['solana', 'ethereum', 'bitcoin']) {
    const endpoint = `/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
    return await this.makeRequest(endpoint);
  }

  async getCoinDetails(coinId) {
    const endpoint = `/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`;
    return await this.makeRequest(endpoint);
  }

  async getMarketData(coinIds = ['solana', 'ethereum', 'bitcoin']) {
    const endpoint = `/coins/markets?vs_currency=usd&ids=${coinIds.join(',')}&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=1h,24h,7d`;
    return await this.makeRequest(endpoint);
  }

  async getHistoricalData(coinId, days = 7) {
    const endpoint = `/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=hourly`;
    return await this.makeRequest(endpoint);
  }

  async getTrendingCoins() {
    const endpoint = '/search/trending';
    return await this.makeRequest(endpoint);
  }

  // Format price data for display
  formatPrice(price) {
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toFixed(8)}`;
    }
  }

  // Format percentage change
  formatPercentage(change) {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  // Get price change emoji
  getPriceEmoji(change) {
    if (change > 5) return '🚀';
    if (change > 0) return '📈';
    if (change < -5) return '📉';
    if (change < 0) return '🔻';
    return '➡️';
  }
}

module.exports = new CoinGeckoAPI();
