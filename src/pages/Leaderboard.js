import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import {
  EmojiEvents,
  TrendingUp,
  Groups,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const Leaderboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [packLeaderboard, setPackLeaderboard] = useState([]);
  const [userLeaderboard, setUserLeaderboard] = useState([]);

  useEffect(() => {
    // Mock leaderboard data
    setPackLeaderboard([
      {
        id: 1,
        name: 'Alpha Hunters',
        score: 125430,
        members: 4,
        winRate: 78.5,
        leader: 'CryptoKing',
        change: '+5.2%',
        trend: 'up',
      },
      {
        id: 2,
        name: 'DeFi Wolves',
        score: 98750,
        members: 5,
        winRate: 82.1,
        leader: 'WolfTrader',
        change: '+3.1%',
        trend: 'up',
      },
      {
        id: 3,
        name: 'Arbitrage Kings',
        score: 87220,
        members: 3,
        winRate: 75.8,
        leader: 'ArbMaster',
        change: '-1.2%',
        trend: 'down',
      },
      {
        id: 4,
        name: 'Yield Farmers',
        score: 76890,
        members: 5,
        winRate: 65.3,
        leader: 'FarmKing',
        change: '+2.8%',
        trend: 'up',
      },
      {
        id: 5,
        name: 'Flash Traders',
        score: 65440,
        members: 2,
        winRate: 88.9,
        leader: 'FlashGod',
        change: '+7.5%',
        trend: 'up',
      },
    ]);

    setUserLeaderboard([
      {
        id: 1,
        username: 'CryptoKing',
        firstName: 'Alex',
        score: 45230,
        winRate: 89.2,
        trades: 156,
        pack: 'Alpha Hunters',
        change: '+12.5%',
        trend: 'up',
      },
      {
        id: 2,
        username: 'WolfTrader',
        firstName: 'Sarah',
        score: 42180,
        winRate: 85.7,
        trades: 203,
        pack: 'DeFi Wolves',
        change: '+8.3%',
        trend: 'up',
      },
      {
        id: 3,
        username: 'ArbMaster',
        firstName: 'Mike',
        score: 38950,
        winRate: 82.4,
        trades: 89,
        pack: 'Arbitrage Kings',
        change: '+5.1%',
        trend: 'up',
      },
      {
        id: 4,
        username: 'FlashGod',
        firstName: 'Emma',
        score: 35670,
        winRate: 91.8,
        trades: 67,
        pack: 'Flash Traders',
        change: '+15.2%',
        trend: 'up',
      },
      {
        id: 5,
        username: 'FarmKing',
        firstName: 'David',
        score: 32440,
        winRate: 76.3,
        trades: 234,
        pack: 'Yield Farmers',
        change: '+3.7%',
        trend: 'up',
      },
    ]);
  }, []);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return 'gold';
      case 2:
        return 'silver';
      case 3:
        return '#CD7F32';
      default:
        return 'text.secondary';
    }
  };

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Leaderboard
      </Typography>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Packs" icon={<Groups />} />
        <Tab label="Users" icon={<Person />} />
      </Tabs>

      {activeTab === 0 && (
        <>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Top performing packs this week
          </Typography>
          
          {packLeaderboard.map((pack, index) => (
            <Card key={pack.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: getRankColor(index + 1),
                      color: 'white',
                      fontWeight: 'bold',
                      mr: 2,
                    }}
                  >
                    {getRankIcon(index + 1)}
                  </Box>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight="bold">
                      {pack.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Leader: {pack.leader} • {pack.members} members
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="h6" fontWeight="bold">
                      {pack.score.toLocaleString()}
                    </Typography>
                    <Chip
                      label={pack.change}
                      size="small"
                      color={pack.trend === 'up' ? 'success' : 'error'}
                      icon={pack.trend === 'up' ? <TrendingUp /> : <TrendingUp style={{ transform: 'rotate(180deg)' }} />}
                    />
                  </Box>
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Win Rate: {pack.winRate}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pack.winRate}
                    sx={{ width: 100, ml: 2 }}
                    color={pack.winRate > 80 ? 'success' : pack.winRate > 60 ? 'warning' : 'error'}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {activeTab === 1 && (
        <>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Top performing traders this week
          </Typography>
          
          {userLeaderboard.map((trader, index) => (
            <Card key={trader.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: getRankColor(index + 1),
                      color: 'white',
                      fontWeight: 'bold',
                      mr: 2,
                    }}
                  >
                    {getRankIcon(index + 1)}
                  </Box>
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight="bold">
                      {trader.firstName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      @{trader.username} • {trader.pack}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="h6" fontWeight="bold">
                      {trader.score.toLocaleString()}
                    </Typography>
                    <Chip
                      label={trader.change}
                      size="small"
                      color={trader.trend === 'up' ? 'success' : 'error'}
                      icon={trader.trend === 'up' ? <TrendingUp /> : <TrendingUp style={{ transform: 'rotate(180deg)' }} />}
                    />
                  </Box>
                </Box>
                
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Win Rate: {trader.winRate}% • {trader.trades} trades
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={trader.winRate}
                    sx={{ width: 100, ml: 2 }}
                    color={trader.winRate > 85 ? 'success' : trader.winRate > 70 ? 'warning' : 'error'}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* User's Position */}
      <Card sx={{ mt: 3, border: '2px solid', borderColor: 'primary.main' }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <EmojiEvents sx={{ color: 'primary.main', mr: 1 }} />
            <Typography variant="h6">
              Your Position
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight="bold">
                #{activeTab === 0 ? '1' : '42'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeTab === 0 ? 'Pack Rank' : 'User Rank'}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="h6" fontWeight="bold">
                {activeTab === 0 ? '125,430' : '12,345'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Score
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Leaderboard;
