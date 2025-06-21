import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Avatar,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Groups,
  Add,
  EmojiEvents,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useTelegram } from '../hooks/useTelegram';

const Packs = () => {
  const { user, updateUser, apiCall } = useAuth();
  const { hapticFeedback, showAlert } = useTelegram();
  
  const [packs, setPacks] = useState([]);
  const [userPack, setUserPack] = useState(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [packName, setPackName] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock pack data
  useEffect(() => {
    setPacks([
      {
        id: 1,
        name: 'Alpha Hunters',
        members: 4,
        maxMembers: 5,
        score: 125430,
        rank: 1,
        strategy: 'Arbitrage Focus',
        risk: 'Medium',
        winRate: 78.5,
        leader: 'CryptoKing',
        isPublic: true,
      },
      {
        id: 2,
        name: 'Flash Traders',
        members: 3,
        maxMembers: 5,
        score: 98750,
        rank: 2,
        strategy: 'Social Trading',
        risk: 'High',
        winRate: 82.1,
        leader: 'QuickTrade',
        isPublic: true,
      },
      {
        id: 3,
        name: 'Safe Haven',
        members: 5,
        maxMembers: 5,
        score: 76890,
        rank: 4,
        strategy: 'Conservative',
        risk: 'Low',
        winRate: 65.3,
        leader: 'SafeTrader',
        isPublic: false,
      },
    ]);

    if (user?.packId) {
      setUserPack(packs.find(p => p.id === user.packId));
    }
  }, [user]);

  const joinPack = async (packId) => {
    hapticFeedback('medium');
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateUser({ packId });
      setUserPack(packs.find(p => p.id === packId));
      showAlert('Successfully joined the pack!');
      
    } catch (error) {
      showAlert('Failed to join pack. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createPack = async () => {
    if (!packName.trim()) {
      showAlert('Please enter a pack name');
      return;
    }

    hapticFeedback('medium');
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newPack = {
        id: Date.now(),
        name: packName,
        members: 1,
        maxMembers: 5,
        score: 0,
        rank: packs.length + 1,
        strategy: 'Custom',
        risk: 'Medium',
        winRate: 0,
        leader: user.firstName,
        isPublic: true,
      };
      
      setPacks([...packs, newPack]);
      updateUser({ packId: newPack.id });
      setUserPack(newPack);
      setCreateDialog(false);
      setPackName('');
      showAlert('Pack created successfully!');
      
    } catch (error) {
      showAlert('Failed to create pack. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const leavePack = async () => {
    hapticFeedback('heavy');
    
    try {
      updateUser({ packId: null });
      setUserPack(null);
      showAlert('Left the pack successfully');
    } catch (error) {
      showAlert('Failed to leave pack');
    }
  };

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Packs
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialog(true)}
          disabled={!!userPack}
        >
          Create
        </Button>
      </Box>

      {/* User's Pack */}
      {userPack && (
        <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <EmojiEvents sx={{ color: 'gold', mr: 1 }} />
              <Typography variant="h6">
                Your Pack: {userPack.name}
              </Typography>
            </Box>
            
            <Grid container spacing={2} mb={2}>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">
                  Rank
                </Typography>
                <Typography variant="h6">
                  #{userPack.rank}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">
                  Score
                </Typography>
                <Typography variant="h6">
                  {userPack.score.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">
                  Win Rate
                </Typography>
                <Typography variant="h6">
                  {userPack.winRate}%
                </Typography>
              </Grid>
            </Grid>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Members: {userPack.members}/{userPack.maxMembers}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(userPack.members / userPack.maxMembers) * 100}
                  sx={{ width: 100, mt: 0.5 }}
                />
              </Box>
              <Chip
                label={userPack.strategy}
                color="primary"
                size="small"
              />
            </Box>

            <Button
              variant="outlined"
              color="error"
              onClick={leavePack}
              disabled={loading}
            >
              Leave Pack
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Available Packs */}
      <Typography variant="h6" mb={2}>
        {userPack ? 'Other Packs' : 'Available Packs'}
      </Typography>

      {packs
        .filter(pack => !userPack || pack.id !== userPack.id)
        .map((pack) => (
          <Card key={pack.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  {pack.name}
                </Typography>
                <Chip
                  label={`#${pack.rank}`}
                  color={pack.rank <= 3 ? 'success' : 'default'}
                  icon={<TrendingUp />}
                />
              </Box>

              <Grid container spacing={2} mb={2}>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Score
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {pack.score.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Win Rate
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {pack.winRate}%
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" color="text.secondary">
                    Members
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {pack.members}/{pack.maxMembers}
                  </Typography>
                </Grid>
              </Grid>

              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Strategy: {pack.strategy} • Risk: {pack.risk}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Leader: {pack.leader}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  onClick={() => joinPack(pack.id)}
                  disabled={loading || !!userPack || pack.members >= pack.maxMembers}
                  startIcon={<Groups />}
                >
                  {pack.members >= pack.maxMembers ? 'Full' : 'Join'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}

      {/* Create Pack Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)}>
        <DialogTitle>Create New Pack</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Pack Name"
            fullWidth
            variant="outlined"
            value={packName}
            onChange={(e) => setPackName(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>
            Cancel
          </Button>
          <Button onClick={createPack} variant="contained" disabled={loading}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Packs;
