import React from 'react';
import { Box, ThemeProvider, CssBaseline, useMediaQuery, useTheme, CircularProgress, Typography, createTheme } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';
import { lightTheme, darkTheme } from './styles/theme';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { useAuthStore } from './store/useAuthStore';
import { subscribeToAuthChanges } from './features/auth/services/firebaseAuthService';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './features/auth/services/firebaseConfig';
import { useProducts } from './hooks/useProducts';

// Layout Components
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { WorkspaceTabs } from './components/layout/WorkspaceTabs';
import { StatusFooter } from './components/layout/StatusFooter';
import { CommandPaletteModal } from './components/layout/CommandPaletteModal';
import { HotkeysListener } from './components/layout/HotkeysListener';
import { MobileNavBar } from './components/layout/MobileNavBar';

// Feature Views
import { DashboardView } from './features/dashboard/DashboardView';
import { POSView } from './features/pos/POSView';
import { MobilePOSView } from './features/pos/components/MobilePOSView';
import { QuickSaleView } from './features/pos/components/QuickSaleView';
import { ProductsView } from './features/products/ProductsView';
import { InventoryView } from './features/inventory/InventoryView';
import { CustomersView } from './features/customers/CustomersView';
import { SuppliersView } from './features/suppliers/SuppliersView';
import { PurchasesView } from './features/purchases/PurchasesView';
import { BillingView } from './features/billing/BillingView';
import { CashView } from './features/cash/CashView';
import { ReportsView } from './features/reports/ReportsView';
import { UsersView } from './features/users/UsersView';
import { SettingsView } from './features/settings/SettingsView';
import { AuditLogsView } from './features/logs/AuditLogsView';
import { IntegrationsView } from './features/integrations/IntegrationsView';
import { AccessibilityView } from './features/accessibility/AccessibilityView';
import { CameraScannerModal } from './features/scanner/components/CameraScannerModal';
import { LoginModal } from './features/auth/components/LoginModal';
import { usePOSStore } from './features/pos/store/usePOSStore';
import { parseQuickVariableProduct } from './features/pos/utils/parseQuickVariableProduct';
import { useNotificationStore } from './store/useNotificationStore';
import { useAccessibilityStore } from './store/useAccessibilityStore';

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

const AppContent: React.FC = () => {
  const { activeTabId } = useWorkspaceStore();
  const { isAuthenticated, isLoading, setUser, setLoading, setCashSession } = useAuthStore();
  const { addProductToCart, addVariableProductToCart } = usePOSStore();
  const { addNotification } = useNotificationStore();
  const { data: products = [] } = useProducts();
  const { themeMode, fontSize, largeButtons, highContrast, reduceAnimations, uiScale } = useAccessibilityStore();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [isQuickSaleMode, setIsQuickSaleMode] = React.useState(false);
  const [isLoginOpen, setIsLoginOpen] = React.useState(false);

  const currentTheme = React.useMemo(() => {
    const baseTheme = themeMode === 'dark' ? darkTheme : lightTheme;
    return createTheme({
    ...baseTheme,
    palette: {
      ...baseTheme.palette,
      ...(highContrast && {
        text: { primary: '#000000', secondary: '#1a1a1a' },
        background: { default: '#FFFFFF', paper: '#FFFFFF' },
      }),
    },
    typography: {
      ...baseTheme.typography,
      fontSize: parseInt(fontSize) * (uiScale / 100),
      body1: {
        ...baseTheme.typography.body1,
        fontSize: fontSize,
      },
      body2: {
        ...baseTheme.typography.body2,
        fontSize: `${parseInt(fontSize) - 1}px`,
      },
    },
    components: {
      ...baseTheme.components,
      MuiButton: {
        ...baseTheme.components?.MuiButton,
        styleOverrides: {
          ...(baseTheme.components?.MuiButton as any)?.styleOverrides,
          root: {
            ...(baseTheme.components?.MuiButton as any)?.styleOverrides?.root,
            minHeight: largeButtons ? 56 : 48,
            transition: reduceAnimations ? 'none' : undefined,
          },
        },
      },
      MuiOutlinedInput: {
        ...baseTheme.components?.MuiOutlinedInput,
        styleOverrides: {
          ...(baseTheme.components?.MuiOutlinedInput as any)?.styleOverrides,
          root: {
            ...(baseTheme.components?.MuiOutlinedInput as any)?.styleOverrides?.root,
            minHeight: largeButtons ? 56 : 48,
          },
        },
      },
      MuiTab: {
        ...baseTheme.components?.MuiTab,
        styleOverrides: {
          ...(baseTheme.components?.MuiTab as any)?.styleOverrides,
          root: {
            ...(baseTheme.components?.MuiTab as any)?.styleOverrides?.root,
            minHeight: largeButtons ? 56 : 48,
          },
        },
      },
    },
  })}, [themeMode, fontSize, largeButtons, highContrast, reduceAnimations, uiScale]);

  // Listen to Firebase auth state on mount
  React.useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      if (firebaseUser) {
        getDoc(doc(db, 'users', firebaseUser.uid))
          .then((snap) => {
            if (snap.exists()) {
              setUser({ id: snap.id, ...snap.data() } as any);
            } else {
              setUser({
                id: firebaseUser.uid,
                username: firebaseUser.email?.split('@')[0] || '',
                email: firebaseUser.email || '',
                fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
                role: 'ADMIN' as const,
                branchId: 'br-01',
                is2FAEnabled: false,
                isActive: true,
              });
            }
            // Restore cash session if open
            getDocs(query(collection(db, 'cash_sessions'), where('isOpen', '==', true)))
              .then((snapshot) => {
                if (!snapshot.empty) {
                  const docSnap = snapshot.docs[0];
                  setCashSession({ id: docSnap.id, ...docSnap.data() } as any);
                }
              })
              .catch(() => {});
            setLoading(false);
          })
          .catch(() => {
            setUser(null);
            setLoading(false);
            setIsLoginOpen(true);
          });
      } else {
        setUser(null);
        setIsLoginOpen(true);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  // Show login modal when not authenticated (after loading)
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setIsLoginOpen(true);
    }
  }, [isLoading, isAuthenticated]);

  const handleScannerDetectedCode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // 1. Check quick expression "2x2000"
    const quickResult = parseQuickVariableProduct(trimmed);
    if (quickResult.isValid) {
      addVariableProductToCart(quickResult.quantity, quickResult.unitPrice);
      addNotification({
        title: 'Producto Vario Agregado',
        message: `Producto Vario agregado: ${quickResult.quantity} × $${quickResult.unitPrice}`,
        type: 'success',
      });
      if (!isQuickSaleMode) setIsScannerOpen(false);
      return;
    }

    // 2. Check special code "0"
    if (trimmed === '0') {
      if (!isQuickSaleMode) setIsScannerOpen(false);
      return;
    }

    // 3. Match product
    const targetProduct = products.find(
      (p) => p.barcode === trimmed || p.sku.toLowerCase() === trimmed.toLowerCase()
    );

    if (targetProduct) {
      if (targetProduct.saleType === 'WEIGHT') {
        if (!isQuickSaleMode) setIsScannerOpen(false);
      } else {
        addProductToCart(targetProduct);
        addNotification({
          title: 'Producto Agregado',
          message: `${targetProduct.name} agregado al ticket`,
          type: 'success',
        });
        if (!isQuickSaleMode) setIsScannerOpen(false);
      }
    } else {
      addNotification({
        title: 'Producto no encontrado',
        message: `No se encontró producto para "${trimmed}"`,
        type: 'warning',
      });
    }
  };

  const renderActiveView = () => {
    switch (activeTabId) {
      case 'dashboard':
        return <DashboardView />;
      case 'pos':
        if (isMobile) {
          if (isQuickSaleMode) {
            return <QuickSaleView onBack={() => setIsQuickSaleMode(false)} />;
          }
          return <MobilePOSView onOpenScanner={() => setIsScannerOpen(true)} />;
        }
        return <POSView />;
      case 'products':
        return <ProductsView />;
      case 'inventory':
        return <InventoryView />;
      case 'customers':
        return <CustomersView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'purchases':
        return <PurchasesView />;
      case 'billing':
        return <BillingView />;
      case 'cash':
        return <CashView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      case 'logs':
        return <AuditLogsView />;
      case 'integrations':
        return <IntegrationsView />;
      case 'accessibility':
        return <AccessibilityView />;
      default:
        return <DashboardView />;
    }
  };

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <ThemeProvider theme={currentTheme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary">Verificando sesión...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={currentTheme}>
        <CssBaseline />
        <LoginModal open={isLoginOpen} onClose={() => {}} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <HotkeysListener />
      <CommandPaletteModal />

      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Top App Header */}
        <Header />

        {/* Main Body Area */}
        <Box sx={{ display: 'flex', flexGrow: 1, pt: '64px', pb: isMobile ? '64px' : '32px', overflow: 'hidden' }}>
          {/* Permanent Collapsible Sidebar (Hidden on Mobile) */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Sidebar />
          </Box>

          {/* Dynamic Workspace Container */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.default' }}>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <WorkspaceTabs />
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>{renderActiveView()}</Box>
          </Box>
        </Box>

        {/* Mobile Fixed Navigation Bar */}
        <MobileNavBar onOpenScanner={() => setIsScannerOpen(true)} />

        {/* Bottom Real-time Status Bar (Desktop) */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <StatusFooter />
        </Box>

        {/* Camera Barcode Scanner Modal */}
        <CameraScannerModal
          open={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onDetected={handleScannerDetectedCode}
        />
      </Box>
    </ThemeProvider>
  );
};

export default App;
