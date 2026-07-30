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
import { OpenTicketsBar } from './components/layout/OpenTicketsBar';
import { StatusFooter } from './components/layout/StatusFooter';
import { CommandPaletteModal } from './components/layout/CommandPaletteModal';
import { HotkeysListener } from './components/layout/HotkeysListener';
import { MobileNavBar } from './components/layout/MobileNavBar';

// Feature Views
import { POSView } from './features/pos/POSView';
import { MobilePOSView } from './features/pos/components/MobilePOSView';
import { QuickSaleView } from './features/pos/components/QuickSaleView';
import { ProductNotFoundAlert } from './features/pos/components/ProductNotFoundAlert';
import { LoginModal } from './features/auth/components/LoginModal';
import { usePOSStore } from './features/pos/store/usePOSStore';
import { parseQuickVariableProduct } from './features/pos/utils/parseQuickVariableProduct';
import { useNotificationStore } from './store/useNotificationStore';
import { useAccessibilityStore } from './store/useAccessibilityStore';

const DashboardView = React.lazy(async () => ({ default: (await import('./features/dashboard/DashboardView')).DashboardView }));
const ProductsView = React.lazy(async () => ({ default: (await import('./features/products/ProductsView')).ProductsView }));
const StockView = React.lazy(async () => ({ default: (await import('./features/stock/StockView')).StockView }));
const InventoryView = React.lazy(async () => ({ default: (await import('./features/inventory/InventoryView')).InventoryView }));
const CustomersView = React.lazy(async () => ({ default: (await import('./features/customers/CustomersView')).CustomersView }));
const SuppliersView = React.lazy(async () => ({ default: (await import('./features/suppliers/SuppliersView')).SuppliersView }));
const PurchasesView = React.lazy(async () => ({ default: (await import('./features/purchases/PurchasesView')).PurchasesView }));
const BillingView = React.lazy(async () => ({ default: (await import('./features/billing/BillingView')).BillingView }));
const CashView = React.lazy(async () => ({ default: (await import('./features/cash/CashView')).CashView }));
const ReportsView = React.lazy(async () => ({ default: (await import('./features/reports/ReportsView')).ReportsView }));
const UsersView = React.lazy(async () => ({ default: (await import('./features/users/UsersView')).UsersView }));
const SettingsView = React.lazy(async () => ({ default: (await import('./features/settings/SettingsView')).SettingsView }));
const AuditLogsView = React.lazy(async () => ({ default: (await import('./features/logs/AuditLogsView')).AuditLogsView }));
const IntegrationsView = React.lazy(async () => ({ default: (await import('./features/integrations/IntegrationsView')).IntegrationsView }));
const AccessibilityView = React.lazy(async () => ({ default: (await import('./features/accessibility/AccessibilityView')).AccessibilityView }));
const CameraScannerModal = React.lazy(async () => ({ default: (await import('./features/scanner/components/CameraScannerModal')).CameraScannerModal }));

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

const AppContent: React.FC = () => {
  const { activeTabId, isSidebarVisible, showSidebar } = useWorkspaceStore();
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
  const [missingProductCode, setMissingProductCode] = React.useState<string | null>(null);
  const isPosFullscreen = activeTabId === 'pos' && !isSidebarVisible;

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

    if (trimmed.toLowerCase() === 'mostrar') {
      showSidebar();
      setIsScannerOpen(false);
      return;
    }

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
      setMissingProductCode(trimmed);
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
      case 'stock':
        return <StockView />;
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
        {!isPosFullscreen && <Header />}

        {/* Main Body Area */}
        <Box sx={{ display: 'flex', flexGrow: 1, pt: isPosFullscreen ? 0 : '64px', pb: isMobile ? '64px' : isPosFullscreen ? 0 : '32px', overflow: 'hidden' }}>
          {/* Permanent Collapsible Sidebar (Hidden on Mobile) */}
          <Box sx={{ display: { xs: 'none', md: isSidebarVisible ? 'block' : 'none' } }}>
            <Sidebar />
          </Box>

          {/* Dynamic Workspace Container */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.default' }}>
          <Box sx={{ display: { xs: 'none', md: isPosFullscreen ? 'none' : 'block' } }}>
              <OpenTicketsBar />
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              <React.Suspense fallback={<Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}><CircularProgress /></Box>}>
                {renderActiveView()}
              </React.Suspense>
            </Box>
          </Box>
        </Box>

        {/* Mobile Fixed Navigation Bar */}
        <MobileNavBar onOpenScanner={() => setIsScannerOpen(true)} />

        {/* Bottom Real-time Status Bar (Desktop) */}
        <Box sx={{ display: { xs: 'none', md: isPosFullscreen ? 'none' : 'block' } }}>
          <StatusFooter />
        </Box>

        {/* Camera Barcode Scanner Modal */}
        {isScannerOpen && (
          <React.Suspense fallback={null}>
            <CameraScannerModal
              open={isScannerOpen}
              onClose={() => setIsScannerOpen(false)}
              onDetected={handleScannerDetectedCode}
            />
          </React.Suspense>
        )}
        <ProductNotFoundAlert code={missingProductCode} onClose={() => setMissingProductCode(null)} />
      </Box>
    </ThemeProvider>
  );
};

export default App;
