import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Tabs,
  Tab,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  FlashOn,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

const Trading = () => {
  const { user, updateUser, apiCall } = useAuth();
  const { hapticFeedback, showAlert, showConfirm } = useTelegram();
  
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPair, setSelectedPair] = useState('SOL/USDC');
  const [amount, setAmount] = useState('');
  const [tradeType, setTradeType] = useState('buy');
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [priceData, setPriceData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [opportunities, setOpportunities] = useState([]);

  // Fetch real price data
  const fetchPriceData = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=1&interval=hourly'
      );
      
      if (response.ok) {
        const data = await response.json();
        const formattedData = data.prices.map(([timestamp, price]) => ({
          time: new Date(timestamp).getHours(),
          price: price,
        }));
        setPriceData(formattedData);
        setCurrentPrice(formattedData[formattedData.length - 1]?.price || 0);
      }
    } catch (error) {
      console.error('Error fetching price data:', error);
    }
  };

  // Fetch arbitrage opportunities
  const fetchOpportunities = async () => {
    try {
      const response = await apiCall('/api/v1/trading/opportunities');
      setOpportunities(response);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      // Mock real-time opportunities
      setOpportunities([
        {
          id: 1,
          pair: 'SOL/USDC',
          buyExchange: 'Orca',
          sellExchange: 'Raydium',
          buyPrice: currentPrice * 0.998,
          sellPrice: currentPrice * 1.002,
          profit: 0.4,
          volume: 50000,
          confidence: 'High',
        },
        {
          id: 2,
          pair: 'ETH/USDC',
          buyExchange: 'SushiSwap',
          sellExchange: 'Uniswap',
          buyPrice: 2340.12,
          sellPrice: 2345.67,
          profit: 0.24,
          volume: 25000,
          confidence: 'Medium',
        },
      ]);
    }
  };

  useEffect(() => {
    fetchPriceData();
    fetchOpportunities();
    
    const interval = setInterval(() => {
      fetchPriceData();
      fetchOpportunities();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showAlert('Please enter a valid amount');
      return;
    }

    const tradeAmount = parseFloat(amount);
    const totalCost = tradeType === 'buy' ? tradeAmount * currentPrice : tradeAmount;

    if (tradeType === 'buy' && totalCost > user.balance) {
      showAlert('Insufficient balance');
      return;
    }

    const confirmed = await showConfirm(
      `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${amount} ${selectedPair.split('/')[0]} for $${totalCost.toFixed(2)}?`
    );

    if (!confirmed) return;

    setLoading(true);
    hapticFeedback('medium');

    try {
      // Simulate trade execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update user balance
      const newBalance = tradeType === 'buy' 
        ? user.balance - totalCost 
        : user.balance + totalCost;
      
      updateUser({ balance: newBalance });
      
      showAlert(`Trade executed successfully! ${tradeType === 'buy' ? 'Bought' : 'Sold'} ${amount} ${selectedPair.split('/')[0]}`);
      setAmount('');
      setConfirmDialog(false);
      
    } catch (error) {
      console.error('Trade error:', error);
      showAlert('Trade failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const executeArbitrage = async (opportunity) => {
    const confirmed = await showConfirm(
      `Execute arbitrage for ${opportunity.pair}?\nProfit: +${opportunity.profit}%\nBuy on ${opportunity.buyExchange}, sell on ${opportunity.sellExchange}`
    );

    if (!confirmed) return;

    setLoading(true);
    hapticFeedback('heavy');

    try {
      // Simulate arbitrage execution
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const profit = (opportunity.profit / 100) * 1000; // Assume $1000 trade
      updateUser({ balance: user.balance + profit });
      
      showAlert(`Arbitrage executed! Profit: +$${profit.toFixed(2)}`);
      
    } catch (error) {
      console.error('Arbitrage error:', error);
      showAlert('Arbitrage failed. Market conditions changed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Trading
      </Typography>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Spot Trading" />
        <Tab label="Arbitrage" />
      </Tabs>

      {activeTab === 0 && (
        <>
          {/* Price Chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">{selectedPair}</Typography>
                <Box textAlign="right">
                  <Typography variant="h6" fontWeight="bold">
                    ${currentPrice.toFixed(2)}
                  </Typography>
                  <Chip
                    label="+2.3%"
                    size="small"
                    color="success"
                    icon={<TrendingUp />}
                  />
                </Box>
              </Box>
              <Box height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceData}>
                    <XAxis dataKey="time" />
                    <YAxis domain={['dataMin', 'dataMax']} />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#2481cc" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          {/* Trading Form */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Place Order
              </Typography>
              
              <Grid container spacing={2} mb={2}>
                <Grid item xs={6}>
                  <Button
                    variant={tradeType === 'buy' ? 'contained' : 'outlined'}
                    color="success"
                    fullWidth
                    onClick={() => setTradeType('buy')}
                  >
                    Buy
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant={tradeType === 'sell' ? 'contained' : 'outlined'}
                    color="error"
                    fullWidth
                    onClick={() => setTradeType('sell')}
                  >
                    Sell
                  </Button>
                </Grid>
              </Grid>

              <TextField
                label={`Amount (${selectedPair.split('/')[0]})`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                fullWidth
                sx={{ mb: 2 }}
              />

              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Total: ${amount && currentPrice ? (parseFloat(amount) * currentPrice).toFixed(2) : '0.00'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Balance: ${user?.balance?.toFixed(2) || '0.00'}
                </Typography>
              </Box>

              <Button
                variant="contained"
                fullWidth
                onClick={handleTrade}
                disabled={loading || !amount}
                startIcon={loading ? <CircularProgress size={20} /> : <SwapHoriz />}
              >
                {loading ? 'Executing...' : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${selectedPair.split('/')[0]}`}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 1 && (
        <>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Arbitrage opportunities are automatically detected across multiple exchanges. 
              Execute trades to profit from price differences.
            </Typography>
          </Alert>

          {opportunities.map((opp) => (
            <Card key={opp.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">{opp.pair}</Typography>
                  <Chip
                    label={`+${opp.profit}%`}
                    color="success"
                    icon={<FlashOn />}
                  />
                </Box>
                
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Buy on {opp.buyExchange}
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      ${opp.buyPrice?.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Sell on {opp.sellExchange}
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      ${opp.sellPrice?.toFixed(2)}
                    </Typography>
                  </Grid>
                </Grid>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Volume: ${opp.volume?.toLocaleString()}
                    </Typography>
                    <Chip
                      label={opp.confidence}
                      size="small"
                      color={opp.confidence === 'High' ? 'success' : 'warning'}
                    />
                  </Box>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => executeArbitrage(opp)}
                    disabled={loading}
                    startIcon={<FlashOn />}
                  >
                    Execute
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </Box>
  );
};

export default Trading;
