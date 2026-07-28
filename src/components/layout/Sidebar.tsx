import React from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Tooltip,
  Divider,
  Chip,
  Button,
} from '@mui/material';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  ShoppingBag,
  Truck,
  FileText,
  Wallet,
  BarChart3,
  UserCheck,
  Settings,
  History,
  Workflow,
  Eye,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useCashierModeStore } from '../../store/useCashierModeStore';

export const ALL_SIDEBAR_ITEMS = [
  { id: 'pos', title: 'Ventas (POS)', icon: ShoppingCart, route: '/pos', adminOnly: false },
  { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, route: '/dashboard', adminOnly: true },
  { id: 'products', title: 'Productos', icon: Package, route: '/products', adminOnly: false },
  { id: 'inventory', title: 'Inventario (Kardex)', icon: Boxes, route: '/inventory', adminOnly: true },
  { id: 'customers', title: 'Clientes', icon: Users, route: '/customers', adminOnly: false },
  { id: 'purchases', title: 'Compras', icon: ShoppingBag, route: '/purchases', adminOnly: true },
  { id: 'suppliers', title: 'Proveedores', icon: Truck, route: '/suppliers', adminOnly: true },
  { id: 'billing', title: 'Facturación / Ventas', icon: FileText, route: '/billing', adminOnly: false },
  { id: 'cash', title: 'Caja & Arqueo', icon: Wallet, route: '/cash', adminOnly: false },
  { id: 'reports', title: 'Reportes Avanzados', icon: BarChart3, route: '/reports', adminOnly: true },
  { id: 'users', title: 'Usuarios & Roles', icon: UserCheck, route: '/users', adminOnly: true },
  { id: 'accessibility', title: 'Accesibilidad', icon: Eye, route: '/accessibility', adminOnly: false },
  { id: 'settings', title: 'Configuración', icon: Settings, route: '/settings', adminOnly: true },
  { id: 'logs', title: 'Logs Auditoría', icon: History, route: '/logs', adminOnly: true },
  { id: 'integrations', title: 'Integraciones MP/ARCA', icon: Workflow, route: '/integrations', adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState<boolean>(false);
  const { openTab, activeTabId } = useWorkspaceStore();
  const { isCashierMode, toggleCashierMode } = useCashierModeStore();

  const visibleItems = isCashierMode
    ? ALL_SIDEBAR_ITEMS.filter((item) => !item.adminOnly)
    : ALL_SIDEBAR_ITEMS;

  const handleItemClick = (item: (typeof ALL_SIDEBAR_ITEMS)[0]) => {
    openTab({
      id: item.id,
      title: item.title,
      iconName: item.id,
      route: item.route,
      closable: item.id !== 'dashboard' && item.id !== 'pos',
    });
  };

  const drawerWidth = collapsed ? 76 : 250;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          top: 64,
          height: 'calc(100vh - 64px - 32px)',
          bgcolor: '#FFFFFF',
          borderRight: '1px solid',
          borderColor: '#E2E8F0',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        },
      }}
    >
      <Box>
        {/* Drawer Control Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5 }}>
          {!collapsed && (
            <Chip
              icon={<ShieldAlert size={14} />}
              label={isCashierMode ? 'Modo Cajero' : 'Modo Admin'}
              color={isCashierMode ? 'warning' : 'primary'}
              size="small"
              onClick={toggleCashierMode}
              sx={{ fontWeight: 700, cursor: 'pointer', height: 28 }}
            />
          )}
          <IconButton size="small" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: '#E2E8F0' }} />

        <List sx={{ px: 1, py: 1 }}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTabId === item.id;

            const buttonContent = (
              <ListItemButton
                onClick={() => handleItemClick(item)}
                selected={isActive}
                sx={{
                  minHeight: 46,
                  borderRadius: 2.5,
                  justifyContent: collapsed ? 'center' : 'initial',
                  px: 2,
                  mb: 0.5,
                  transition: 'all 0.15s ease',
                  '&.Mui-selected': {
                    bgcolor: '#EFF6FF',
                    color: '#2563EB',
                    '& .MuiListItemIcon-root': { color: '#2563EB' },
                    '&:hover': {
                      bgcolor: '#DBEAFE',
                    },
                  },
                  '&:hover': {
                    bgcolor: isActive ? '#DBEAFE' : '#F8FAFC',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: collapsed ? 0 : 2,
                    justifyContent: 'center',
                    color: isActive ? '#2563EB' : '#64748B',
                  }}
                >
                  <Icon size={20} />
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.title}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: '0.9375rem',
                          fontWeight: isActive ? 800 : 600,
                          color: isActive ? '#2563EB' : '#334155',
                        },
                      },
                    }}
                  />
                )}
              </ListItemButton>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.id} title={item.title} placement="right">
                  <div>{buttonContent}</div>
                </Tooltip>
              );
            }

            return <React.Fragment key={item.id}>{buttonContent}</React.Fragment>;
          })}
        </List>
      </Box>

      {/* Bottom Collapse Trigger Button matching mockup */}
      <Box sx={{ p: 1.5, borderTop: '1px solid #E2E8F0' }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => setCollapsed(!collapsed)}
          startIcon={collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          sx={{
            borderRadius: 2.5,
            minHeight: 40,
            borderColor: '#E2E8F0',
            color: '#475569',
            fontWeight: 700,
            fontSize: '0.875rem',
            bgcolor: '#FFFFFF',
            justifyContent: collapsed ? 'center' : 'flex-start',
            '&:hover': { bgcolor: '#F8FAFC', borderColor: '#CBD5E1' },
          }}
        >
          {!collapsed && 'Contraer'}
        </Button>
      </Box>
    </Drawer>
  );
};
