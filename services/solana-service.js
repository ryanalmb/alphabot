const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { Token, TOKEN_PROGRAM_ID } = require('@solana/spl-token');

class SolanaService {
  constructor() {
    // Use mainnet for production, devnet for testing
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    // Initialize with provided private key or generate new one
    this.wallet = this.initializeWallet();
    
    // Common token addresses on Solana
    this.tokens = {
      SOL: 'So11111111111111111111111111111111111111112',
      USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE'
    };
    
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  initializeWallet() {
    try {
      if (process.env.SOLANA_PRIVATE_KEY) {
        // Decode base64 private key
        const privateKeyArray = JSON.parse(Buffer.from(process.env.SOLANA_PRIVATE_KEY, 'base64').toString());
        return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
      }
    } catch (error) {
      console.error('Error loading Solana private key:', error);
    }
    
    // Generate new keypair for demo purposes
    const keypair = Keypair.generate();
    console.log('Generated new Solana wallet:', keypair.publicKey.toString());
    console.log('Private key (base64):', Buffer.from(JSON.stringify(Array.from(keypair.secretKey))).toString('base64'));
    return keypair;
  }

  async getBalance(publicKey = null) {
    try {
      const key = publicKey ? new PublicKey(publicKey) : this.wallet.publicKey;
      const balance = await this.connection.getBalance(key);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting SOL balance:', error);
      return 0;
    }
  }

  async getTokenBalance(tokenMintAddress, walletAddress = null) {
    try {
      const walletKey = walletAddress ? new PublicKey(walletAddress) : this.wallet.publicKey;
      const tokenMint = new PublicKey(tokenMintAddress);
      
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(walletKey, {
        mint: tokenMint
      });

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const tokenAccount = tokenAccounts.value[0];
      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount.pubkey);
      return parseFloat(accountInfo.value.uiAmount || 0);
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0;
    }
  }

  async getPortfolio(walletAddress = null) {
    const cacheKey = `portfolio_${walletAddress || this.wallet.publicKey.toString()}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const portfolio = {
        wallet: walletAddress || this.wallet.publicKey.toString(),
        balances: {},
        totalValueUSD: 0,
        lastUpdated: new Date().toISOString()
      };

      // Get SOL balance
      portfolio.balances.SOL = await this.getBalance(walletAddress);

      // Get major token balances
      for (const [symbol, mintAddress] of Object.entries(this.tokens)) {
        if (symbol !== 'SOL') {
          portfolio.balances[symbol] = await this.getTokenBalance(mintAddress, walletAddress);
        }
      }

      // Calculate total value (would need price data integration)
      portfolio.totalValueUSD = portfolio.balances.SOL * 150; // Placeholder price

      this.cache.set(cacheKey, { data: portfolio, timestamp: Date.now() });
      return portfolio;
    } catch (error) {
      console.error('Error getting portfolio:', error);
      return {
        wallet: walletAddress || this.wallet.publicKey.toString(),
        balances: { SOL: 0 },
        totalValueUSD: 0,
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  async simulateSwap(fromToken, toToken, amount) {
    try {
      // This would integrate with Jupiter API for real swap simulation
      const mockRate = this.getMockExchangeRate(fromToken, toToken);
      const outputAmount = amount * mockRate;
      const fee = amount * 0.0025; // 0.25% fee
      
      return {
        inputToken: fromToken,
        outputToken: toToken,
        inputAmount: amount,
        outputAmount: outputAmount - fee,
        fee: fee,
        priceImpact: 0.1, // 0.1%
        route: [`${fromToken} → ${toToken}`],
        estimatedGas: 0.001 // SOL
      };
    } catch (error) {
      console.error('Error simulating swap:', error);
      throw error;
    }
  }

  getMockExchangeRate(fromToken, toToken) {
    // Mock exchange rates for simulation
    const rates = {
      'SOL_USDC': 150,
      'USDC_SOL': 1/150,
      'SOL_USDT': 149.5,
      'USDT_SOL': 1/149.5,
      'USDC_USDT': 0.999,
      'USDT_USDC': 1.001
    };
    
    return rates[`${fromToken}_${toToken}`] || 1;
  }

  async executeSwap(fromToken, toToken, amount, slippage = 1) {
    try {
      // In a real implementation, this would:
      // 1. Get the best route from Jupiter
      // 2. Create the swap transaction
      // 3. Sign and send the transaction
      
      console.log(`Simulating swap: ${amount} ${fromToken} → ${toToken}`);
      
      const simulation = await this.simulateSwap(fromToken, toToken, amount);
      
      // Mock transaction hash
      const txHash = `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        transactionHash: txHash,
        ...simulation,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      };
    } catch (error) {
      console.error('Error executing swap:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getTransactionHistory(walletAddress = null, limit = 10) {
    try {
      const walletKey = walletAddress ? new PublicKey(walletAddress) : this.wallet.publicKey;
      
      const signatures = await this.connection.getSignaturesForAddress(walletKey, { limit });
      
      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await this.connection.getTransaction(sig.signature);
            return {
              signature: sig.signature,
              slot: sig.slot,
              timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : null,
              status: sig.err ? 'failed' : 'success',
              fee: tx?.meta?.fee || 0
            };
          } catch (error) {
            return {
              signature: sig.signature,
              status: 'error',
              error: error.message
            };
          }
        })
      );

      return transactions;
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  formatBalance(balance, decimals = 6) {
    return parseFloat(balance.toFixed(decimals));
  }

  formatAddress(address, length = 8) {
    if (!address) return '';
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }

  isValidAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new SolanaService();
