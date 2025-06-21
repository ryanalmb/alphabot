import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TradingIcon,
  Groups as PacksIcon,
  Leaderboard as LeaderboardIcon,
  Person as ProfileIcon,
} from '@mui/icons-material';
import { useTelegram } from '../hooks/useTelegram';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hapticFeedback } = useTelegram();

  const currentPath = location.pathname;

  const handleChange = (event, newValue) => {
    hapticFeedback('light');
    navigate(newValue);
  };

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        zIndex: 1000,
      }} 
      elevation={3}
    >
      <BottomNavigation
        value={currentPath}
        onChange={handleChange}
        showLabels
        sx={{
          height: 70,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '6px 12px 8px',
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.75rem',
            marginTop: '4px',
          },
        }}
      >
        <BottomNavigationAction
          label="Dashboard"
          value="/dashboard"
          icon={<DashboardIcon />}
        />
        <BottomNavigationAction
          label="Trading"
          value="/trading"
          icon={<TradingIcon />}
        />
        <BottomNavigationAction
          label="Packs"
          value="/packs"
          icon={<PacksIcon />}
        />
        <BottomNavigationAction
          label="Leaderboard"
          value="/leaderboard"
          icon={<LeaderboardIcon />}
        />
        <BottomNavigationAction
          label="Profile"
          value="/profile"
          icon={<ProfileIcon />}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default Navigation;
