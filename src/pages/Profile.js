import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  Grid,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Person,
  AccountBalanceWallet,
  TrendingUp,
  Settings,
  Notifications,
  Security,
  Help,
  ExitToApp,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

const Profile = () => {
  const { user, logout } = useAuth();
  const { hapticFeedback, showConfirm } = useTelegram();
  
  const [notifications, setNotifications] = useState(true);
  const [autoTrade, setAutoTrade] = useState(false);

  const handleLogout = async () => {
    const confirmed = await showConfirm('Are you sure you want to logout?');
    if (confirmed) {
      hapticFeedback('medium');
      logout();
    }
  };

  const stats = [
    { label: 'Total Trades', value: '156', icon: <TrendingUp /> },
    { label: 'Win Rate', value: '78.5%', icon: <TrendingUp /> },
    { label: 'Best Trade', value: '+$1,234', icon: <TrendingUp /> },
    { label: 'Total Profit', value: '+$12,345', icon: <AccountBalanceWallet /> },
  ];

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Profile
      </Typography>

      {/* User Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar
              sx={{ width: 60, height: 60, mr: 2, bgcolor: 'primary.main' }}
            >
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                @{user?.username || 'username'}
              </Typography>
              <Chip
                label="Premium Member"
                size="small"
                color="primary"
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Portfolio Balance
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="primary.main">
              ${user?.balance?.toLocaleString() || '0'}
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary">
            Member since {new Date(user?.joinedAt || Date.now()).toLocaleDateString()}
          </Typography>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <Grid container spacing={2} mb={3}>
        {stats.map((stat, index) => (
          <Grid item xs={6} key={index}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box color="primary.main" mb={1}>
                  {stat.icon}
                </Box>
                <Typography variant="h6" fontWeight="bold">
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Settings Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>
            Settings
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
            }
            label="Push Notifications"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={autoTrade}
                onChange={(e) => setAutoTrade(e.target.checked)}
              />
            }
            label="Auto-execute Arbitrage"
          />
        </CardContent>
      </Card>

      {/* Menu Items */}
      <Card>
        <List>
          <ListItem button>
            <ListItemIcon>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Trading Preferences" />
          </ListItem>
          
          <Divider />
          
          <ListItem button>
            <ListItemIcon>
              <Security />
            </ListItemIcon>
            <ListItemText primary="Security & Privacy" />
          </ListItem>
          
          <Divider />
          
          <ListItem button>
            <ListItemIcon>
              <Notifications />
            </ListItemIcon>
            <ListItemText primary="Notification Settings" />
          </ListItem>
          
          <Divider />
          
          <ListItem button>
            <ListItemIcon>
              <Help />
            </ListItemIcon>
            <ListItemText primary="Help & Support" />
          </ListItem>
          
          <Divider />
          
          <ListItem button onClick={handleLogout}>
            <ListItemIcon>
              <ExitToApp color="error" />
            </ListItemIcon>
            <ListItemText primary="Logout" sx={{ color: 'error.main' }} />
          </ListItem>
        </List>
      </Card>
    </Box>
  );
};

export default Profile;
