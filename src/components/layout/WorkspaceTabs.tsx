import React from 'react';
import { Box, Tabs, Tab, IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { ALL_SIDEBAR_ITEMS } from './sidebarItems';

export const WorkspaceTabs: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, closeTab, openTab } = useWorkspaceStore();
  const [addMenuAnchor, setAddMenuAnchor] = React.useState<null | HTMLElement>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleOpenAddMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAddMenuAnchor(event.currentTarget);
  };

  const handleCloseAddMenu = () => {
    setAddMenuAnchor(null);
  };

  const handleQuickAdd = (item: (typeof ALL_SIDEBAR_ITEMS)[0]) => {
    openTab({
      id: item.id,
      title: item.title,
      iconName: item.id,
      route: item.route,
      closable: item.id !== 'dashboard' && item.id !== 'pos',
    });
    handleCloseAddMenu();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #E2E8F0',
        bgcolor: '#FFFFFF', // Pure White Tabs Header
        px: 2,
        pt: 0.5,
        gap: 1,
      }}
    >
      <Tabs
        value={activeTabId}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 40,
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
            bgcolor: '#2563EB', // Vibrant Blue Underline
          },
        }}
      >
        {tabs.map((t) => {
          const isActive = t.id === activeTabId;
          return (
            <Tab
              key={t.id}
              value={t.id}
              sx={{
                minHeight: 40,
                py: 0.5,
                px: 2,
                color: isActive ? '#2563EB' : '#475569',
                bgcolor: isActive ? '#EFF6FF' : 'transparent',
                borderRadius: '8px 8px 0 0',
                border: isActive ? '1px solid #CBD5E1' : '1px solid transparent',
                borderBottom: 'none',
                '&.Mui-selected': {
                  color: '#2563EB',
                },
              }}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: isActive ? 900 : 700 }}>{t.title}</span>
                  {t.closable && (
                    <IconButton
                      size="small"
                      component="span"
                      onClick={(e) => handleClose(e, t.id)}
                      sx={{
                        p: 0.25,
                        ml: 0.5,
                        color: isActive ? '#2563EB' : '#64748B',
                        opacity: 0.8,
                        '&:hover': { opacity: 1, bgcolor: '#DBEAFE' },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  )}
                </Box>
              }
            />
          );
        })}
      </Tabs>

      <Tooltip title="Abrir nueva pestaña">
        <IconButton
          size="small"
          onClick={handleOpenAddMenu}
          sx={{
            bgcolor: '#F8FAFC',
            color: '#475569',
            p: 0.75,
            border: '1px solid #CBD5E1',
            '&:hover': { bgcolor: '#F1F5F9', color: '#0F172A' },
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={addMenuAnchor}
        open={Boolean(addMenuAnchor)}
        onClose={handleCloseAddMenu}
        slotProps={{ paper: { sx: { width: 240, maxH: 380, bgcolor: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0' } } }}
      >
        {ALL_SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <MenuItem key={item.id} onClick={() => handleQuickAdd(item)} sx={{ py: 1, '&:hover': { bgcolor: '#F8FAFC' } }}>
              <ListItemIcon sx={{ color: '#2563EB' }}>
                <Icon size={18} />
              </ListItemIcon>
              <ListItemText primary={item.title} slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 800, color: '#0F172A' } } }} />
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
};
