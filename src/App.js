import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress, Typography } from '@mui/material';

// Components
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Trading from './pages/Trading';
import Packs from './pages/Packs';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

// Hooks
import { useTelegram } from './hooks/useTelegram';
import { useAuth } from './hooks/useAuth';

function App() {
  const { tg, user, ready } = useTelegram();
  const { isAuthenticated, login, loading: authLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Create theme based on Telegram theme
  const theme = createTheme({
    palette: {
      mode: tg?.colorScheme === 'dark' ? 'dark' : 'light',
      primary: {
        main: tg?.themeParams?.button_color || '#2481cc',
      },
      background: {
        default: tg?.themeParams?.bg_color || '#ffffff',
        paper: tg?.themeParams?.secondary_bg_color || '#f8f9fa',
      },
      text: {
        primary: tg?.themeParams?.text_color || '#000000',
        secondary: tg?.themeParams?.hint_color || '#999999',
      },
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
    },
  });

  // Auto-login when Telegram user is available
  useEffect(() => {
    if (user && !isAuthenticated && !authLoading) {
      login(user);
    }
  }, [user, isAuthenticated, authLoading, login]);

  // Show loading while initializing
  if (!ready || authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          gap={2}
        >
          <CircularProgress size={40} />
          <Typography variant="body1" color="text.secondary">
            Loading Alpha Pack...
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          gap={2}
          p={3}
        >
          <Typography variant="h5" textAlign="center">
            Welcome to Alpha Pack
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Please start the bot in Telegram to continue
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box display="flex" flexDirection="column" minHeight="100vh">
          <Box flex={1} overflow="auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/trading" element={<Trading />} />
              <Route path="/packs" element={<Packs />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Box>
          <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
