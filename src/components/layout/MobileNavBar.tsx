import React from 'react';
import { Box, Typography, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { ShoppingCart, Camera, Receipt, History, Menu as MenuIcon } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { ALL_SIDEBAR_ITEMS } from './sidebarItems';

interface MobileNavBarProps {
  onOpenScanner: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({ onOpenScanner }) => {
  const { activeTabId, setActiveTab, openTab } = useWorkspaceStore();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const NAV_ITEMS = [
    { id: 'pos', label: 'Venta', icon: ShoppingCart, action: () => setActiveTab('pos') },
    { id: 'scan', label: 'Escanear', icon: Camera, action: onOpenScanner },
    { id: 'ticket', label: 'Ticket', icon: Receipt, action: () => setActiveTab('pos') },
    { id: 'reports', label: 'Historial', icon: History, action: () => setActiveTab('reports') },
    { id: 'more', label: 'Más', icon: MenuIcon, action: () => setDrawerOpen(true) },
  ];

  return (
    <>
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          bgcolor: '#FFFFFF',
          color: '#0F172A',
          borderTop: '1px solid #E2E8F0',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.06),',
          zIndex: 1200,
          justify: 'space-around',
          alignItems: 'center',
          pb: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const IconComp = item.icon;
          const isActive = activeTabId === item.id || (item.id === 'ticket' && activeTabId === 'pos');
          return (
            <Box
              key={item.id}
              onClick={item.action}
              sx={{
                flex: 1,
                minHeight: 48,
                minWidth: 48,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isActive ? '#2563EB' : '#64748B',
                py: 0.5,
              }}
            >
              <IconComp size={22} />
              <Typography variant="caption" sx={{ fontSize: '0.72rem', fontWeight: isActive ? 800 : 600, mt: 0.25 }}>
                {item.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Mobile Drawer Menu */}
      <Drawer anchor="bottom" open={drawerOpen} onClose={() => setDrawerOpen(false)} slotProps={{ paper: { sx: { bgcolor: '#FFFFFF', color: '#0F172A', borderRadius: '16px 16px 0 0', p: 1, border: '1px solid #E2E8F0' } } }}>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A' }}>
            Menú Principal Nexus POS
          </Typography>
        </Box>
        <Divider sx={{ borderColor: '#E2E8F0' }} />
        <List>
          {ALL_SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  onClick={() => {
                    openTab({
                      id: item.id,
                      title: item.title,
                      iconName: item.id,
                      route: item.route,
                      closable: item.id !== 'dashboard' && item.id !== 'pos',
                    });
                    setDrawerOpen(false);
                  }}
                  sx={{ py: 1.5 }}
                >
                  <ListItemIcon sx={{ color: '#2563EB', minWidth: 40 }}>
                    <Icon size={22} />
                  </ListItemIcon>
                  <ListItemText primary={item.title} slotProps={{ primary: { sx: { fontWeight: 700, fontSize: '1rem', color: '#0F172A' } } }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>
    </>
  );
};
