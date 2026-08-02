import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Tooltip,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  HelpOutlined,
  Store,
  AccountBalanceWallet,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { LogIn } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCommandPaletteStore } from '../../store/useCommandPaletteStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { LoginModal } from '../../features/auth/components/LoginModal';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { ApiStatusChips } from './ApiStatusChips';

export const Header: React.FC = () => {
  const { branches, activeBranch, setActiveBranch, user, cashSession } = useAuthStore();
  const { openPalette } = useCommandPaletteStore();
  const { notifications, unreadCount, markAsRead } = useNotificationStore();
  const { openTab } = useWorkspaceStore();

  const [notifAnchorEl, setNotifAnchorEl] = React.useState<HTMLButtonElement | null>(null);
  const [isLoginOpen, setIsLoginOpen] = React.useState(false);

  const handleOpenNotif = (event: React.MouseEvent<HTMLButtonElement>) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleCloseNotif = () => {
    setNotifAnchorEl(null);
  };

  const handleOpenSettings = () => {
    openTab({
      id: 'settings',
      title: 'Configuración',
      iconName: 'settings',
      route: '/settings',
      closable: true,
    });
  };

  const notifOpen = Boolean(notifAnchorEl);

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: '#FFFFFF', // Pure White Header Background
          color: '#0F172A',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', height: 64, px: 2 }}>
          {/* Left Brand & Context */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                N
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: '-0.02em', color: '#0F172A' }}>
                Nexus <span style={{ color: '#2563EB' }}>POS</span>
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ my: 1.5, mx: 0.5, borderColor: '#E2E8F0' }} />

            {/* Branch Switcher Dropdown */}
            {activeBranch && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Store fontSize="small" sx={{ color: '#64748B' }} />
                <Select
                  size="small"
                  value={activeBranch.id}
                  onChange={(e) => setActiveBranch(e.target.value)}
                  sx={{
                    height: 36,
                    fontSize: '0.875rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    bgcolor: '#F8FAFC',
                    borderRadius: 2.5,
                    border: '1px solid #CBD5E1',
                    '& .MuiSelect-icon': { color: '#64748B' },
                    '& .MuiSelect-select': { py: 0.5, px: 1.5 },
                  }}
                >
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id} sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>
                      {b.name}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}

            {/* Cash Register Status */}
            {cashSession && cashSession.isOpen ? (
              <Chip
                icon={<AccountBalanceWallet fontSize="small" style={{ color: '#16A34A' }} />}
                label="Caja #1 • Abierta"
                variant="outlined"
                size="small"
                sx={{
                  fontWeight: 800,
                  height: 32,
                  color: '#15803D',
                  borderColor: '#86EFAC',
                  bgcolor: '#DCFCE7',
                }}
              />
            ) : (
              <Chip
                icon={<AccountBalanceWallet fontSize="small" style={{ color: '#DC2626' }} />}
                label="Caja Cerrada"
                variant="outlined"
                size="small"
                sx={{
                  fontWeight: 800,
                  height: 32,
                  color: '#B91C1C',
                  borderColor: '#FCA5A5',
                  bgcolor: '#FEE2E2',
                }}
              />
            )}

            <ApiStatusChips />
          </Box>

          {/* Center Global Search Trigger (CTRL+K) */}
          <Box
            onClick={openPalette}
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1.5,
              bgcolor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: 3,
              px: 2,
              py: 0.75,
              width: 360,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#2563EB',
                bgcolor: '#F1F5F9',
              },
            }}
          >
            <SearchIcon fontSize="small" sx={{ color: '#2563EB' }} />
            <Typography variant="body2" sx={{ flexGrow: 1, color: '#475569', fontWeight: 600 }}>
              Buscar productos, clientes, ventas...
            </Typography>
            <Box
              sx={{
                px: 0.8,
                py: 0.2,
                bgcolor: '#FFFFFF',
                borderRadius: 1,
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#475569',
                border: '1px solid #CBD5E1',
              }}
            >
              CTRL + K
            </Box>
          </Box>

          {/* Right Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Atajos & Ayuda">
              <IconButton size="small" sx={{ color: '#475569', p: 1, '&:hover': { bgcolor: '#F1F5F9', color: '#0F172A' } }}>
                <HelpOutlined fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Configuración Global">
              <IconButton onClick={handleOpenSettings} size="small" sx={{ color: '#475569', p: 1, '&:hover': { bgcolor: '#F1F5F9', color: '#0F172A' } }}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Notifications Popover Trigger */}
            <Tooltip title="Notificaciones">
              <IconButton onClick={handleOpenNotif} size="small" sx={{ color: '#475569', p: 1, '&:hover': { bgcolor: '#F1F5F9', color: '#0F172A' } }}>
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>

            <Popover
              open={notifOpen}
              anchorEl={notifAnchorEl}
              onClose={handleCloseNotif}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { width: 340, mt: 1, p: 1, bgcolor: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0' } } }}
            >
              <Typography variant="subtitle1" sx={{ p: 1, fontWeight: 900, color: '#0F172A' }}>
                Centro de Notificaciones
              </Typography>
              <Divider sx={{ borderColor: '#E2E8F0' }} />
              <List sx={{ maxH: 300, overflowY: 'auto', py: 0 }}>
                {notifications.length === 0 ? (
                  <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: '#64748B' }}>
                    Sin notificaciones recientes
                  </Typography>
                ) : (
                  notifications.map((n) => (
                    <ListItem
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: n.read ? 'transparent' : '#EFF6FF',
                        borderRadius: 1.5,
                        mb: 0.5,
                      }}
                    >
                      <ListItemText
                        primary={n.title}
                        secondary={n.message}
                        slotProps={{
                          primary: { variant: 'subtitle2', sx: { fontWeight: n.read ? 600 : 800, color: '#0F172A' } },
                          secondary: { variant: 'caption', sx: { color: '#64748B' } },
                        }}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </Popover>

            <Divider orientation="vertical" flexItem sx={{ my: 1.5, mx: 0.5, borderColor: '#E2E8F0' }} />

            {/* User Profile / Firebase Login Trigger */}
            <Box
              onClick={() => setIsLoginOpen(true)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                pl: 1,
                cursor: 'pointer',
                p: 0.5,
                borderRadius: 2,
                '&:hover': { bgcolor: '#F8FAFC' },
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: '#2563EB',
                  fontSize: '0.875rem',
                  fontWeight: 900,
                  color: '#FFFFFF',
                }}
              >
                {user?.fullName?.charAt(0) || 'U'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                <Typography variant="subtitle2" sx={{ lineHeight: 1.2, fontWeight: 900, color: '#0F172A' }}>
                  {user?.fullName}
                </Typography>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748B', fontWeight: 700 }}>
                  <LogIn size={12} color="#2563EB" /> {user?.role} (Firebase)
                </Typography>
              </Box>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Firebase Login Modal */}
      <LoginModal open={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
};
