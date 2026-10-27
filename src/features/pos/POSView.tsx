import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Chip,
  Select,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  Search as SearchIcon,
  User,
  CreditCard,
  Percent,
  Pause,
  Trash2,
  UserCheck,
  Store,
  MoreVertical,
  Store as StoreIcon,
  PackagePlus,
  PackageMinus,
  Edit2,
  Printer,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  Camera,
} from 'lucide-react';
import { usePOSStore } from './store/usePOSStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useProducts, useUpdateProduct } from '../../hooks/useProducts';
import { useCustomers } from '../../hooks/useCustomers';
import { useAuthStore } from '../../store/useAuthStore';
import type { Product, Sale } from '../../types';
import { WeightInputModal } from './components/WeightInputModal';
import { VariableProductModal } from './components/VariableProductModal';
import { POSPaymentModal } from './components/POSPaymentModal';
import { POSSuspendedModal } from './components/POSSuspendedModal';
import { POSTicketPrintModal } from './components/POSTicketPrintModal';
import { ProductNotFoundAlert } from './components/ProductNotFoundAlert';
import { parseQuickVariableProduct } from './utils/parseQuickVariableProduct';
import { parseQuickProductQuantity } from './utils/parseQuickProductQuantity';
import { calculateCartTotals } from './utils/calculateCartTotals';
import { POSStockEntryModal } from './components/POSStockEntryModal';
import { ProductDrawerEditor } from '../products/components/ProductDrawerEditor';
import { CashMovementModal } from '../cash/components/CashMovementModal';
import { useCurrentCashSession, useCreateCashMovement } from '../../hooks/useCashSessions';
import { useSales } from '../../hooks/useSales';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { logoutFirebase } from '../auth/services/firebaseAuthService';
import { ApiStatusChips } from '../../components/layout/ApiStatusChips';


interface POSViewProps {
  onOpenScanner: () => void;
}

export const POSView: React.FC<POSViewProps> = ({ onOpenScanner }) => {
  const {
    cart,
    customer,
    setCustomer,
    addProductToCart,
    addWeightProductToCart,
    addVariableProductToCart,
    removeItemFromCart,
    clearCart,
    suspendSale,
    openPaymentModal,
    isPaymentModalOpen,
    payments,
    selectedItemIndex,
    setSelectedItemIndex,
    updateItemDiscount,
    discountGlobal,
    setDiscountGlobal,
  } = usePOSStore();
  const { addNotification } = useNotificationStore();
  const { data: products = [] } = useProducts();
  const updateProduct = useUpdateProduct();
  const { data: customers = [] } = useCustomers();
  const { user, logout } = useAuthStore();
  const { data: cashSession } = useCurrentCashSession();
  const createCashMovement = useCreateCashMovement();
  const { data: sales = [] } = useSales();
  const openTab = useWorkspaceStore((state) => state.openTab);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [weightModalProduct, setWeightModalProduct] = React.useState<Product | null>(null);
  const [isVariableModalOpen, setIsVariableModalOpen] = React.useState(false);
  const [isSuspendedModalOpen, setIsSuspendedModalOpen] = React.useState(false);
  const [lastCompletedSale, setLastCompletedSale] = React.useState<Sale | null>(null);
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = React.useState(false);
  const [missingProductCode, setMissingProductCode] = React.useState<string | null>(null);
  const [discountTarget, setDiscountTarget] = React.useState<'GLOBAL' | string | null>(null);
  const [discountValue, setDiscountValue] = React.useState('');
  const [isStockEntryOpen, setIsStockEntryOpen] = React.useState(false);
  const [stockAdjustmentMode, setStockAdjustmentMode] = React.useState<'IN' | 'OUT'>('IN');
  const [outOfStockProduct, setOutOfStockProduct] = React.useState<Product | null>(null);
  const [stockEntryProduct, setStockEntryProduct] = React.useState<Product | null>(null);
  const [isProductSearchOpen, setIsProductSearchOpen] = React.useState(false);
  const [productSearchTerm, setProductSearchTerm] = React.useState('');
  const [selectedSearchProduct, setSelectedSearchProduct] = React.useState<Product | null>(null);
  const [searchSelectedIndex, setSearchSelectedIndex] = React.useState<number>(0);
  const [isPriceChangeOpen, setIsPriceChangeOpen] = React.useState(false);
  const [isProductEditorOpen, setIsProductEditorOpen] = React.useState(false);
  const [productEditorProduct, setProductEditorProduct] = React.useState<Product | null>(null);
  const [isProductModifyOpen, setIsProductModifyOpen] = React.useState(false);
  const [productModifyCode, setProductModifyCode] = React.useState('');
  const [cashMovementType, setCashMovementType] = React.useState<'INCOME' | 'WITHDRAWAL'>('INCOME');
  const [isCashMovementOpen, setIsCashMovementOpen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [priceChangeCode, setPriceChangeCode] = React.useState('');
  const [priceChangeProduct, setPriceChangeProduct] = React.useState<Product | null>(null);
  const [newPrice, setNewPrice] = React.useState('');

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const ticketScrollRef = React.useRef<HTMLDivElement>(null);
  const priceCodeRef = React.useRef<HTMLInputElement>(null);
  const priceInputRef = React.useRef<HTMLInputElement>(null);
  const productModifyCodeRef = React.useRef<HTMLInputElement>(null);

  const focusSearchInput = React.useCallback(() => {
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 50);
  }, []);

  React.useEffect(() => {
    focusSearchInput();
  }, [focusSearchInput]);

  React.useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.documentElement.requestFullscreen().catch(() => {});
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  React.useEffect(() => {
    ticketScrollRef.current?.scrollTo({ top: ticketScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [cart]);

  // Keep focus on the scanner input after any click outside inputs
  React.useEffect(() => {
    const handleGlobalClick = () => {
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.getAttribute('role') !== 'textbox') {
        if (document.activeElement?.getAttribute('data-pos-selection') === 'true') return;
        focusSearchInput();
      }
    };
    window.addEventListener('mouseup', handleGlobalClick);
    return () => window.removeEventListener('mouseup', handleGlobalClick);
  }, [focusSearchInput]);

  // Re-focus scanner when payment modal closes
  React.useEffect(() => {
    if (!isPaymentModalOpen) {
      focusSearchInput();
    }
  }, [isPaymentModalOpen, focusSearchInput]);

  // Keyboard Shortcuts Listener (F4 = Cobrar, F2 = Cliente, F6 = Suspender, Ctrl+B = Buscar)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) openPaymentModal();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setIsCustomerSelectOpen((prev) => !prev);
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (cart.length > 0) suspendSale();
      } else if ((e.ctrlKey && e.key.toLowerCase() === 'b') || e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setProductSearchTerm('');
        setSelectedSearchProduct(null);
        setSearchSelectedIndex(0);
        setIsProductSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, openPaymentModal, suspendSale]);

  const handleSearchKeyDown = (e: Pick<React.KeyboardEvent<HTMLInputElement>, 'key' | 'preventDefault'>) => {
    const trimmed = searchTerm.trim();

    if (e.key === 'Enter') {
      if (!trimmed) {
        if (cart.length > 0) openPaymentModal();
        return;
      }

      if (trimmed.toLowerCase() === 'b') {
        setSearchTerm('');
        setProductSearchTerm('');
        setSelectedSearchProduct(null);
        setSearchSelectedIndex(0);
        setIsProductSearchOpen(true);
        return;
      }

      if (trimmed.toLowerCase() === 'mostrar') {
        useWorkspaceStore.getState().showSidebar();
        setSearchTerm('');
        return;
      }

      if (trimmed.toLowerCase() === 'ocultar') {
        useWorkspaceStore.getState().setActiveTab('pos');
        useWorkspaceStore.getState().hideSidebar();
        setSearchTerm('');
        focusSearchInput();
        return;
      }

      if (trimmed.toLowerCase() === 's') {
        setStockAdjustmentMode('IN');
        setIsStockEntryOpen(true);
        setSearchTerm('');
        return;
      }

      if (trimmed.toLowerCase() === 'i' || trimmed.toLowerCase() === 'r') {
        openCashMovement(trimmed.toLowerCase() === 'i' ? 'INCOME' : 'WITHDRAWAL');
        setSearchTerm('');
        return;
      }

      if (trimmed.toLowerCase() === 'a') {
        setProductEditorProduct(null);
        setIsProductEditorOpen(true);
        setSearchTerm('');
        return;
      }

      if (trimmed.toLowerCase() === 'c') {
        openPriceChange();
        setSearchTerm('');
        return;
      }

      if (trimmed.toLowerCase() === 'z') {
        if (cart.length > 0) suspendSale();
        setSearchTerm('');
        return;
      }

      if (trimmed.toLowerCase() === 'm') {
        setProductModifyCode('');
        setIsProductModifyOpen(true);
        setSearchTerm('');
        setTimeout(() => productModifyCodeRef.current?.focus(), 50);
        return;
      }

      // 1. PRIORITY 1: Detect fast expression "CANTIDAD.CODIGO" (e.g. 1.999999, 4.7790123456789)
      const qtyResult = parseQuickProductQuantity(trimmed);
      if (qtyResult.isValid) {
        const qtyTargetProduct = products.find(
          (p) => p.barcode === qtyResult.code || p.sku.toLowerCase() === qtyResult.code.toLowerCase()
        );
        if (qtyTargetProduct) {
          const qtyInCart = cart
            .filter((item) => item.product.id === qtyTargetProduct.id)
            .reduce((total, item) => total + item.quantity, 0);

          if (qtyTargetProduct.tracksStock !== false && qtyInCart + qtyResult.quantity > qtyTargetProduct.stock) {
            setOutOfStockProduct(qtyTargetProduct);
          } else if (qtyTargetProduct.saleType === 'WEIGHT') {
            setWeightModalProduct(qtyTargetProduct);
          } else {
            addProductToCart(qtyTargetProduct, qtyResult.quantity);
            addNotification({
              title: 'Producto Agregado',
              message: `${qtyTargetProduct.name} × ${qtyResult.quantity} agregado al ticket`,
              type: 'success',
            });
          }
          setSearchTerm('');
          focusSearchInput();
          return;
        }
      }

      // 1c. PRIORITY 1c: Detect fast expression "CANTIDAD * PRECIO" para Producto Vario (e.g. 2*2000, 2,5*2000)
      const quickResult = parseQuickVariableProduct(trimmed);
      if (quickResult.isValid) {
        addVariableProductToCart(quickResult.quantity, quickResult.unitPrice);
        setSearchTerm('');
        focusSearchInput();

        addNotification({
          title: 'Producto Vario Agregado',
          message: `Producto Vario agregado: ${quickResult.quantity} × $${quickResult.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })} = $${quickResult.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
          type: 'success',
        });
        return;
      }

      // 2. PRIORITY 2: Special barcode "0" (opens VariableProductModal)
      if (trimmed === '0') {
        setIsVariableModalOpen(true);
        setSearchTerm('');
        return;
      }

      // 3. PRIORITY 3, 4, 5, 6: Exact Barcode, SKU, Internal Code, Name
      const exactMatch = products.find(
        (p) => p.barcode === trimmed || p.sku.toLowerCase() === trimmed.toLowerCase()
      );
      const fuzzyMatch = products.find(
        (p) => p.name.toLowerCase().includes(trimmed.toLowerCase())
      );
      const targetProduct = exactMatch || fuzzyMatch;

      if (targetProduct) {
        const quantityInCart = cart
          .filter((item) => item.product.id === targetProduct.id)
          .reduce((total, item) => total + item.quantity, 0);

        if (targetProduct.tracksStock !== false && quantityInCart + 1 > targetProduct.stock) {
          setOutOfStockProduct(targetProduct);
        } else if (targetProduct.saleType === 'WEIGHT') {
          setWeightModalProduct(targetProduct);
        } else {
          addProductToCart(targetProduct);
          focusSearchInput();
        }
        setSearchTerm('');
      } else {
        setMissingProductCode(trimmed);
        setSearchTerm('');
        focusSearchInput();
        addNotification({
          title: 'Producto no encontrado',
          message: `No se encontró ningún producto para: "${trimmed}"`,
          type: 'warning',
        });
      }
    }
  };

  const handleConfirmWeight = (product: Product, weightKg: number) => {
    addWeightProductToCart(product, weightKg);
    setWeightModalProduct(null);
    focusSearchInput();
  };

  const openStockEntry = () => {
    setStockEntryProduct(outOfStockProduct);
    setOutOfStockProduct(null);
    setStockAdjustmentMode('IN');
    setIsStockEntryOpen(true);
  };

  const openStockRemoval = () => {
    setStockEntryProduct(null);
    setStockAdjustmentMode('OUT');
    setIsStockEntryOpen(true);
  };

  const productSearchResults = React.useMemo(() => {
    const query = productSearchTerm.trim().toLowerCase();
    if (!query) return products.slice(0, 50);
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode?.includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.categoryName?.toLowerCase().includes(query)
      );
    }).slice(0, 50);
  }, [products, productSearchTerm]);

  const addSearchProductToCart = (targetProduct?: Product) => {
    const product = targetProduct || selectedSearchProduct || productSearchResults[searchSelectedIndex] || productSearchResults[0];
    if (!product) return;

    const quantityInCart = cart
      .filter((item) => item.product.id === product.id)
      .reduce((total, item) => total + item.quantity, 0);
    if (product.tracksStock !== false && quantityInCart + 1 > product.stock) {
      setOutOfStockProduct(product);
      setIsProductSearchOpen(false);
      return;
    }

    if (product.saleType === 'WEIGHT') {
      setWeightModalProduct(product);
    } else {
      addProductToCart(product);
    }
    setIsProductSearchOpen(false);
    focusSearchInput();
  };

  const handleConfirmVariable = (quantity: number, unitPrice: number) => {
    addVariableProductToCart(quantity, unitPrice);
    setIsVariableModalOpen(false);
    focusSearchInput();
  };

  const openPriceChange = () => {
    setPriceChangeCode('');
    setPriceChangeProduct(null);
    setNewPrice('');
    setIsPriceChangeOpen(true);
    setTimeout(() => priceCodeRef.current?.focus(), 50);
  };

  const findPriceChangeProduct = () => {
    const code = priceChangeCode.trim();
    if (!code) return;
    const product = products.find((item) => item.barcode === code || item.sku.toLowerCase() === code.toLowerCase());
    if (!product) {
      addNotification({ title: 'Producto no encontrado', message: `No se encontró el código "${code}".`, type: 'warning' });
      priceCodeRef.current?.select();
      return;
    }
    setPriceChangeProduct(product);
    setNewPrice(String(product.salePrice));
    setTimeout(() => {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    }, 50);
  };

  const savePriceChange = async () => {
    const price = Number(newPrice.replace(',', '.'));
    if (!priceChangeProduct || !Number.isFinite(price) || price < 0) return;
    await updateProduct.mutateAsync({ id: priceChangeProduct.id, data: { salePrice: price } });
    setIsPriceChangeOpen(false);
    focusSearchInput();
  };

  const openProductEditorFromCode = () => {
    const code = productModifyCode.trim();
    const product = products.find((item) => item.barcode === code || item.sku.toLowerCase() === code.toLowerCase());
    if (!product) {
      addNotification({ title: 'Producto no encontrado', message: `No se encontró el código "${code}".`, type: 'warning' });
      productModifyCodeRef.current?.select();
      return;
    }
    setIsProductModifyOpen(false);
    setProductEditorProduct(product);
    setIsProductEditorOpen(true);
  };

  // Financial Summary
  const { subtotal, taxTotal, discountTotal, grandTotal } = calculateCartTotals(cart, discountGlobal);

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const changeDue = Math.max(0, totalPaid - grandTotal);
  // useSales() ya devuelve las ventas más nuevas primero (orderBy createdAt desc),
  // por eso el primer COMPLETED con comprobante fiscal es la última factura.
  const lastInvoice = sales.find((sale) => sale.status === 'COMPLETED' && (sale.fiscalInvoice || String(sale.notes || '').includes('CAE')));

  const openDiscountDialog = (target: 'GLOBAL' | string) => {
    const item = target === 'GLOBAL' ? null : cart.find((cartItem) => cartItem.product.id === target);
    setDiscountValue(String(target === 'GLOBAL' ? discountGlobal : item?.discount || 0));
    setDiscountTarget(target);
  };

  const applyDiscount = () => {
    const discount = Number(discountValue.replace(',', '.'));
    if (!Number.isFinite(discount) || discount < 0 || discount > 100 || !discountTarget) return;
    if (discountTarget === 'GLOBAL') setDiscountGlobal(discount);
    else updateItemDiscount(discountTarget, discount);
    setDiscountTarget(null);
  };

  const openCashMovement = (type: 'INCOME' | 'WITHDRAWAL') => {
    if (!cashSession || !user) {
      addNotification({ title: 'Caja cerrada', message: 'Abrí una sesión de caja antes de registrar movimientos.', type: 'warning' });
      return;
    }
    setCashMovementType(type);
    setIsCashMovementOpen(true);
  };

  const changeUser = async () => {
    await logoutFirebase();
    logout();
  };

  const createCashMovementFromPos = (amount: number, reason: string) => {
    if (!cashSession || !user) return;
    createCashMovement.mutate({
      cashSessionId: cashSession.id,
      type: cashMovementType,
      amount,
      reason,
      userId: user.id,
      userName: user.fullName,
      createdAt: new Date().toISOString(),
    }, { onSuccess: () => setIsCashMovementOpen(false) });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 0,
        p: 0,
        bgcolor: '#D9D9D9',
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <Box sx={{ px: 1, py: 0.45, bgcolor: '#2F66D0', borderTop: '1px solid #FFFFFF', borderBottom: '2px solid #1E4C9A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ color: '#FFFFFF', fontWeight: 900, fontSize: '1.15rem', textShadow: '1px 1px #173B78' }}>
          VENTA DE PRODUCTOS · Ticket actual
        </Typography>
        {isFullscreen && (
          <IconButton size="small" onClick={() => document.exitFullscreen()} sx={{ color: '#FFFFFF', bgcolor: '#DC2626', borderRadius: 0.5, '&:hover': { bgcolor: '#B91C1C' } }} aria-label="Salir de pantalla completa">
            <X size={20} />
          </IconButton>
        )}
      </Box>

      {/* Scanner row, intentionally dense to ease migration from legacy POS terminals. */}
      <Paper elevation={0} square sx={{ p: 0.7, bgcolor: '#F3F3F3', borderBottom: '1px solid #AFAFAF', display: 'flex', alignItems: 'center', gap: 1, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        <Typography sx={{ color: '#1E4EBC', fontWeight: 800, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Código del Producto:</Typography>
        <TextField
          inputRef={searchInputRef}
          fullWidth
          placeholder="Escanee un código de barras o escriba el código"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><SearchIcon size={20} color="#1E4EBC" /></InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: 0.5,
                      bgcolor: '#E7F2FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 0,
                    }}
                  >
                    <StoreIcon size={22} color="#2563EB" />
                  </Box>
                </InputAdornment>
              ),
              sx: {
                height: 36,
                fontSize: '1rem',
                fontWeight: 700,
                color: '#0F172A',
                bgcolor: '#FFFFFF',
                '& fieldset': { borderColor: '#2F66D0' },
              },
            },
          }}
        />
        <Button
          variant="outlined"
          onClick={() => handleSearchKeyDown({ key: 'Enter', preventDefault: () => undefined })}
          sx={{ minWidth: 205, height: 36, borderRadius: 0.5, fontSize: '0.82rem', fontWeight: 800, color: '#1C1C1C', borderColor: '#2F66D0', bgcolor: '#FFFFFF' }}
        >
          ✓ ENTER · Agregar producto
        </Button>
        <Button
          variant="contained"
          onClick={onOpenScanner}
          startIcon={<Camera size={18} />}
          sx={{ minWidth: 130, height: 36, borderRadius: 0.5, fontSize: '0.82rem', fontWeight: 800 }}
        >
          Escanear QR
        </Button>
      </Paper>

      {/* Compact legacy-style operation toolbar. */}
      <Paper
        elevation={0}
        sx={{
          px: 0.75,
          py: 0.55,
          borderRadius: 0,
          bgcolor: '#ECECEC',
          borderBottom: '1px solid #AFAFAF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <User size={18} color="#64748B" />
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Cliente: <span style={{ fontWeight: 800 }}>{customer.name}</span>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserCheck size={18} color="#64748B" />
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Vendedor: <span style={{ fontWeight: 800 }}>{user?.fullName || 'Sin asignar'}</span>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Store size={18} color="#64748B" />
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Caja: <span style={{ fontWeight: 800 }}>Caja #1</span>
            </Typography>
          </Box>

          <ApiStatusChips />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isCustomerSelectOpen ? (
            <Select
              size="small"
              value={customer.id}
              onChange={(e) => {
                const selected = customers.find((c) => c.id === e.target.value);
                if (selected) setCustomer(selected);
                setIsCustomerSelectOpen(false);
              }}
                sx={{ height: 30, fontWeight: 700, fontSize: '0.85rem', bgcolor: '#FFFFFF' }}
            >
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id} sx={{ fontWeight: 700 }}>
                  👤 {c.name}
                </MenuItem>
              ))}
            </Select>
          ) : (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setIsCustomerSelectOpen(true)}
              startIcon={<User size={16} />}
              sx={{
                borderRadius: 0.5,
                bgcolor: '#FFFFFF',
                color: '#1C1C1C',
                borderColor: '#2F66D0',
                fontWeight: 700,
                textTransform: 'none',
                height: 30,
                px: 1.5,
                '&:hover': { bgcolor: '#E7F2FF' },
              }}
            >
              Cambiar cliente (F2)
            </Button>
          )}
        </Box>
      </Paper>

      {/* Main ticket grid */}
      <Paper
        elevation={2}
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          overflow: 'hidden',
          border: '1px solid #8A8A8A',
          bgcolor: '#FFFFFF',
        }}
      >
        <Box sx={{ px: 1.25, py: 0.45, bgcolor: '#D6D6D6', borderBottom: '1px solid #8A8A8A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 900, color: '#1C1C1C', fontSize: '0.9rem' }}>
            Ticket {cart.length ? `${cart.length} artículo${cart.length === 1 ? '' : 's'}` : 'nuevo'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={suspendSale}
              startIcon={<Pause size={16} />}
              sx={{
                borderRadius: 0.5,
                borderColor: '#2F66D0',
                color: '#1C1C1C',
                fontWeight: 700,
                height: 28,
                px: 1.25,
                bgcolor: '#FFFFFF',
                '&:hover': { bgcolor: '#E7F2FF' },
              }}
            >
              Suspender (F6)
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={clearCart}
              startIcon={<Trash2 size={16} />}
              sx={{
                borderRadius: 0.5,
                borderColor: '#B94141',
                color: '#DC2626',
                fontWeight: 700,
                height: 28,
                px: 1.25,
                bgcolor: '#FFFFFF',
                '&:hover': { bgcolor: '#FEE2E2' },
              }}
            >
              Vaciar Ticket
            </Button>

            <IconButton size="small" sx={{ color: '#64748B', border: '1px solid #8A8A8A', borderRadius: 0.5, width: 28, height: 28 }}>
              <MoreVertical size={20} />
            </IconButton>
          </Box>
        </Box>

        {/* Scrollable Ticket Table */}
        <Box ref={ticketScrollRef} sx={{ flexGrow: 1, overflowY: 'auto' }}>
          <Table stickyHeader sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#E6E5D7', color: '#1C1C1C', fontWeight: 800, fontSize: '0.78rem', borderBottom: '1px solid #AFAFAF', py: 0.4 } }}>
                <TableCell sx={{ width: 60 }}>#</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell align="center" sx={{ width: 140 }}>Cantidad</TableCell>
                <TableCell align="right" sx={{ width: 180 }}>Precio Unit.</TableCell>
                <TableCell align="right" sx={{ width: 180 }}>Subtotal</TableCell>
                <TableCell align="center" sx={{ width: 90 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cart.map((item, index) => {
                const isSelected = index === selectedItemIndex;
                return (
                  <TableRow
                    key={item.product.id}
                    hover
                    tabIndex={0}
                    data-pos-selection="true"
                    onClick={(event) => {
                      setSelectedItemIndex(index);
                      event.currentTarget.focus();
                    }}
                    onKeyDown={(event) => {
                      if (event.key.toLowerCase() === 'd') {
                        event.preventDefault();
                        openDiscountDialog(item.product.id);
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected ? '#E5F0FF !important' : '#FFFFFF',
                      borderLeft: isSelected ? '3px solid #2F66D0' : '3px solid transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: isSelected ? '#DBEAFE !important' : '#F1F5F9 !important' },
                      '& td': { py: 0.75, borderBottom: '1px solid #E1E1E1' },
                    }}
                  >
                  <TableCell sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>{index + 1}</TableCell>

                  {/* Producto Name + SKU/Barcode + Badges */}
                  <TableCell>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.05rem', lineHeight: 1.3 }}>
                      {item.product.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.25 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, color: '#64748B' }}>
                        {item.product.barcode && item.product.barcode !== '0' ? `Código: ${item.product.barcode} | ` : ''}SKU: {item.product.sku}
                      </Typography>

                      {item.discount > 0 && <Chip label={`${item.discount}% dto.`} size="small" sx={{ height: 22, fontWeight: 800, bgcolor: '#FFF3CD', color: '#8A5800', borderRadius: 0.5 }} />}

                      {item.saleType === 'WEIGHT' && item.weightKg && (
                        <Chip
                          label={`${item.weightKg.toFixed(3)} kg`}
                          size="small"
                          sx={{
                            bgcolor: '#EFF6FF',
                            color: '#2563EB',
                            fontWeight: 800,
                            height: 22,
                            fontSize: '0.85rem',
                            borderRadius: 2,
                          }}
                        />
                      )}

                      {item.isVariableProduct && (
                        <Chip
                          label={`${item.quantity} x $${item.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                          size="small"
                          sx={{
                            bgcolor: '#EFF6FF',
                            color: '#2563EB',
                            fontWeight: 800,
                            height: 22,
                            fontSize: '0.85rem',
                            borderRadius: 2,
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>

                  {/* Cantidad Control Box */}
                  <TableCell align="center">
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 1.5,
                        py: 0.75,
                        bgcolor: '#F8FAFC',
                        borderRadius: 2.5,
                        border: '1px solid #E2E8F0',
                        minWidth: 70,
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
                        {item.saleType === 'WEIGHT' && item.weightKg ? `${item.weightKg.toFixed(3)} kg` : item.quantity}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Precio Unitario */}
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem' }}>
                    ${item.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {item.saleType === 'WEIGHT' ? '/kg' : ''}
                  </TableCell>

                  {/* Subtotal */}
                  <TableCell align="right" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.15rem' }}>
                    ${item.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </TableCell>

                  {/* Actions Trash Icon */}
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => removeItemFromCart(item.product.id)}
                      sx={{
                        color: '#DC2626',
                        bgcolor: '#FEF2F2',
                        borderRadius: 2,
                        width: 34,
                        height: 34,
                        '&:hover': { bgcolor: '#FEE2E2' },
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            </TableBody>
          </Table>
        </Box>

        <Box sx={{ p: 1.25, bgcolor: '#E8E8E8', borderTop: '1px solid #8A8A8A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Left Figures */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 280 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#475569', fontSize: '1.05rem' }}>
                Subtotal
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.05rem' }}>
                ${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#475569', fontSize: '1.05rem' }}>
                Descuento
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 900, color: discountTotal > 0 ? '#DC2626' : '#0F172A', fontSize: '1.05rem' }}>
                -${discountTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#475569', fontSize: '1.05rem' }}>
                Impuestos (IVA 21%)
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.05rem' }}>
                ${taxTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5, borderTop: '1px solid #AFAFAF', mt: 0.25 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A' }}>
                TOTAL VENTA
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: '#2563EB', fontSize: '2.25rem' }}>
                ${grandTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>

          {/* Right Supermarket "A PAGAR / CAMBIO" Highlight Containers */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* A PAGAR Box */}
            <Box
              sx={{
                p: 1.25,
                borderRadius: 0.5,
                bgcolor: '#FFFFFF',
                border: '1px solid #8A8A8A',
                minWidth: 220,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                A PAGAR
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: '#16A34A', fontSize: '2.25rem' }}>
                ${grandTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #DCFCE7', mt: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534' }}>
                  PAGADO
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534' }}>
                  ${totalPaid.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Box>

            {/* CAMBIO Box */}
            <Box
              sx={{
                p: 1.25,
                borderRadius: 0.5,
                bgcolor: '#DCE8F3',
                border: '1px solid #8A8A8A',
                minWidth: 210,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CAMBIO
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: '#2563EB', fontSize: '2.25rem' }}>
                ${changeDue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 0.75, p: 0.75, bgcolor: '#ECECEC', borderTop: '1px solid #FFFFFF' }}>
        <Button fullWidth size="large" variant="outlined" onClick={() => void changeUser()} startIcon={<UserCheck size={20} />} sx={{ py: 1, borderRadius: 0.5, fontWeight: 800, fontSize: '1rem', minHeight: 42 }}>
          Cambiar usuario
        </Button>
        <Button fullWidth size="large" variant="contained" onClick={() => lastInvoice && setLastCompletedSale(lastInvoice)} disabled={!lastInvoice} startIcon={<Printer size={20} />} sx={{ py: 1, borderRadius: 0.5, fontWeight: 800, fontSize: '1rem', minHeight: 42 }}>
          Última factura
        </Button>
        <Button fullWidth size="large" variant="outlined" onClick={() => openTab({ id: 'billing', title: 'Facturación', iconName: 'Receipt', route: '/billing', closable: true })} startIcon={<Receipt size={20} />} sx={{ py: 1, borderRadius: 0.5, fontWeight: 800, fontSize: '1rem', minHeight: 42 }}>
          Ver facturación
        </Button>
        <Button fullWidth size="large" variant="outlined" color="success" onClick={() => openCashMovement('INCOME')} startIcon={<ArrowDownCircle size={20} />} sx={{ py: 1, borderRadius: 0.5, fontWeight: 800, fontSize: '1rem', minHeight: 42 }}>
          Ingresar dinero
        </Button>
        <Button fullWidth size="large" variant="outlined" color="warning" onClick={() => openCashMovement('WITHDRAWAL')} startIcon={<ArrowUpCircle size={20} />} sx={{ py: 1, borderRadius: 0.5, fontWeight: 800, fontSize: '1rem', minHeight: 42 }}>
          Retirar dinero
        </Button>
        <Button
          fullWidth
          size="large"
          variant="contained"
          onClick={() => { setStockAdjustmentMode('IN'); setIsStockEntryOpen(true); }}
          startIcon={<PackagePlus size={20} />}
          sx={{ py: 1, borderRadius: 0.5, fontWeight: 800, fontSize: '1rem', minHeight: 42, bgcolor: '#E8F5E9', color: '#123D16', border: '1px solid #26702A', boxShadow: 'none', '&:hover': { bgcolor: '#D2EBD4' } }}
        >
          Agregar stock
        </Button>
        <Button
          fullWidth
          size="large"
          variant="contained"
          onClick={openStockRemoval}
          startIcon={<PackageMinus size={20} />}
          sx={{ py: 1, borderRadius: 0.5, fontWeight: 800, fontSize: '1rem', minHeight: 42, bgcolor: '#FEF2F2', color: '#991B1B', border: '1px solid #DC2626', boxShadow: 'none', '&:hover': { bgcolor: '#FEE2E2' } }}
        >
          Quitar stock
        </Button>
        <Button
          fullWidth
          size="large"
          variant="contained"
          onClick={() => { setProductEditorProduct(null); setIsProductEditorOpen(true); }}
          startIcon={<PackagePlus size={20} />}
          sx={{ py: 1, borderRadius: 0.5, fontWeight: 800, fontSize: '1rem', minHeight: 42, bgcolor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #2563EB', boxShadow: 'none', '&:hover': { bgcolor: '#DBEAFE' } }}
        >
          Agregar producto
        </Button>
        <Button
          fullWidth
          size="large"
          variant="contained"
          onClick={openPriceChange}
          startIcon={<Edit2 size={20} />}
          sx={{ py: 1, borderRadius: 0.5, fontWeight: 800, fontSize: '1rem', minHeight: 42, bgcolor: '#FFF7ED', color: '#9A3412', border: '1px solid #C2410C', boxShadow: 'none', '&:hover': { bgcolor: '#FFEDD5' } }}
        >
          Cambiar precio
        </Button>
        <Button
          fullWidth
          size="large"
          variant="outlined"
          onClick={() => { setProductModifyCode(''); setIsProductModifyOpen(true); setTimeout(() => productModifyCodeRef.current?.focus(), 50); }}
          startIcon={<Edit2 size={20} />}
          sx={{ py: 1, borderRadius: 0.5, fontWeight: 800, fontSize: '1rem', minHeight: 42 }}
        >
          Modificar
        </Button>
        {/* 1. Cobrar (Solid Vibrant Blue) */}
        <Button
          fullWidth
          size="large"
          variant="contained"
          color="primary"
          onClick={openPaymentModal}
          startIcon={<CreditCard size={22} />}
          sx={{
            py: 1,
            borderRadius: 0.5,
            fontWeight: 900,
            fontSize: '1.15rem',
            minHeight: 42,
            bgcolor: '#E8F5E9',
            color: '#123D16',
            border: '1px solid #26702A',
            '&:hover': { bgcolor: '#D2EBD4' },
          }}
        >
          Cobrar (F4)
        </Button>

        {/* 2. % Descuento (Soft Blue) */}
        <Button
          fullWidth
          size="large"
          variant="contained"
          startIcon={<Percent size={20} />}
          onClick={() => openDiscountDialog('GLOBAL')}
          sx={{
            py: 1,
            borderRadius: 0.5,
            fontWeight: 800,
            fontSize: '1.05rem',
            minHeight: 42,
            bgcolor: '#FFFFFF',
            color: '#1C1C1C',
            border: '1px solid #2F66D0',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#DBEAFE' },
          }}
        >
          Descuento
        </Button>

        {/* 3. Cliente (Soft Blue) */}
        <Button
          fullWidth
          size="large"
          variant="contained"
          onClick={() => setIsCustomerSelectOpen(true)}
          startIcon={<User size={20} />}
          sx={{
            py: 1,
            borderRadius: 0.5,
            fontWeight: 800,
            fontSize: '1.05rem',
            minHeight: 42,
            bgcolor: '#FFFFFF',
            color: '#1C1C1C',
            border: '1px solid #2F66D0',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#DBEAFE' },
          }}
        >
          Cliente (F2)
        </Button>

        {/* 4. Suspender (F6) (Soft Cream/Yellow) */}
        <Button
          fullWidth
          size="large"
          variant="contained"
          onClick={suspendSale}
          startIcon={<Pause size={20} />}
          sx={{
            py: 1,
            borderRadius: 0.5,
            fontWeight: 800,
            fontSize: '1.05rem',
            minHeight: 42,
            bgcolor: '#FFFFFF',
            color: '#1C1C1C',
            border: '1px solid #2F66D0',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#FEF3C7' },
          }}
        >
          Suspender (F6)
        </Button>

        {/* 5. Vaciar Ticket (Soft Red) */}
        <Button
          fullWidth
          size="large"
          variant="contained"
          onClick={clearCart}
          startIcon={<Trash2 size={20} />}
          sx={{
            py: 1,
            borderRadius: 0.5,
            fontWeight: 800,
            fontSize: '1.05rem',
            minHeight: 42,
            bgcolor: '#FFFFFF',
            color: '#DC2626',
            border: '1px solid #B94141',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#FEE2E2' },
          }}
        >
          Vaciar Ticket
        </Button>
      </Box>

      {/* MODALS */}
      <WeightInputModal
        product={weightModalProduct}
        open={Boolean(weightModalProduct)}
        onClose={() => {
          setWeightModalProduct(null);
          focusSearchInput();
        }}
        onConfirm={handleConfirmWeight}
      />

      <VariableProductModal
        open={isVariableModalOpen}
        onClose={() => {
          setIsVariableModalOpen(false);
          focusSearchInput();
        }}
        onConfirm={handleConfirmVariable}
      />

      <POSPaymentModal onPrintTicket={(sale) => setLastCompletedSale(sale)} />
      <POSSuspendedModal open={isSuspendedModalOpen} onClose={() => setIsSuspendedModalOpen(false)} />
      <POSTicketPrintModal sale={lastCompletedSale} onClose={() => setLastCompletedSale(null)} />
      <ProductNotFoundAlert code={missingProductCode} onClose={() => setMissingProductCode(null)} />
      <POSStockEntryModal open={isStockEntryOpen} onClose={() => { setIsStockEntryOpen(false); setStockEntryProduct(null); }} products={products} initialProduct={stockEntryProduct} mode={stockAdjustmentMode} />
      <CashMovementModal open={isCashMovementOpen} type={cashMovementType} onClose={() => setIsCashMovementOpen(false)} onConfirm={createCashMovementFromPos} isPending={createCashMovement.isPending} />
      <ProductDrawerEditor product={productEditorProduct} open={isProductEditorOpen} onClose={() => { setIsProductEditorOpen(false); setProductEditorProduct(null); focusSearchInput(); }} />

      <Dialog open={isProductModifyOpen} onClose={() => setIsProductModifyOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Modificar producto</DialogTitle>
        <DialogContent>
          <TextField inputRef={productModifyCodeRef} autoFocus fullWidth label="Código de barras o SKU" value={productModifyCode} onChange={(event) => setProductModifyCode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); openProductEditorFromCode(); } }} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsProductModifyOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={openProductEditorFromCode}>Modificar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isPriceChangeOpen} onClose={() => setIsPriceChangeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Cambiar precio</DialogTitle>
        <DialogContent>
          <TextField
            inputRef={priceCodeRef}
            autoFocus
            fullWidth
            label="Código de barras o SKU"
            value={priceChangeCode}
            onChange={(event) => setPriceChangeCode(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); findPriceChangeProduct(); } }}
            sx={{ mb: 2 }}
          />
          {priceChangeProduct && (
            <Box sx={{ p: 2, bgcolor: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 900 }}>{priceChangeProduct.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Precio actual: ${priceChangeProduct.salePrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}{priceChangeProduct.saleType === 'WEIGHT' ? ' / kg' : ''}
              </Typography>
              <TextField
                inputRef={priceInputRef}
                autoFocus
                fullWidth
                type="number"
                label={priceChangeProduct.saleType === 'WEIGHT' ? 'Nuevo precio por kg' : 'Nuevo precio'}
                value={newPrice}
                onChange={(event) => setNewPrice(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') void savePriceChange(); }}
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsPriceChangeOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void savePriceChange()} disabled={!priceChangeProduct || updateProduct.isPending}>
            {updateProduct.isPending ? 'Guardando...' : 'Guardar precio'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isProductSearchOpen}
        onClose={() => {
          setIsProductSearchOpen(false);
          focusSearchInput();
        }}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              maxHeight: '85vh',
              width: '100%',
              maxWidth: 960,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            pb: 1.5,
            pt: 2.5,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: '#EFF6FF', borderRadius: 2.5, color: '#1E4EBC', display: 'flex', alignItems: 'center' }}>
              <SearchIcon size={24} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', lineHeight: 1.2 }}>
                Búsqueda de Productos (B)
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                Buscá por código, descripción o código de barras · Navegá con ↑ ↓ y presioná Enter
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => {
              setIsProductSearchOpen(false);
              focusSearchInput();
            }}
            size="small"
            sx={{ color: '#64748B', '&:hover': { bgcolor: '#F1F5F9' } }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <Box sx={{ px: 3, pt: 2, pb: 1.5, bgcolor: '#FFFFFF' }}>
          <TextField
            autoFocus
            fullWidth
            placeholder="Escribí código, descripción o código de barras..."
            value={productSearchTerm}
            onChange={(event) => {
              setProductSearchTerm(event.target.value);
              setSearchSelectedIndex(0);
              setSelectedSearchProduct(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSearchSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, productSearchResults.length - 1)));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSearchSelectedIndex((prev) => Math.max(prev - 1, 0));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                const targetProduct = productSearchResults[searchSelectedIndex] || selectedSearchProduct || productSearchResults[0];
                if (targetProduct) {
                  addSearchProductToCart(targetProduct);
                }
              } else if (event.key === 'Escape') {
                event.preventDefault();
                setIsProductSearchOpen(false);
                focusSearchInput();
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size={20} color="#64748B" />
                  </InputAdornment>
                ),
                endAdornment: productSearchTerm ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setProductSearchTerm('');
                        setSearchSelectedIndex(0);
                        setSelectedSearchProduct(null);
                      }}
                    >
                      <X size={16} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  borderRadius: 3,
                  fontSize: '1rem',
                  fontWeight: 600,
                  bgcolor: '#F8FAFC',
                },
              },
            }}
          />
        </Box>

        <DialogContent sx={{ p: 0, px: 3, flexGrow: 1, overflowY: 'auto' }}>
          {productSearchResults.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: '#64748B' }}>
              <Typography variant="body1" sx={{ fontWeight: 800, mb: 0.5, color: '#334155' }}>
                No se encontraron productos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Verificá que el código o la descripción ingresada sean correctos.
              </Typography>
            </Box>
          ) : (
            <Table size="small" stickyHeader sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', bgcolor: '#F8FAFC', py: 1.2, width: '22%' }}>CÓDIGO</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#475569', bgcolor: '#F8FAFC', py: 1.2, width: '40%' }}>DESCRIPCIÓN</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#475569', bgcolor: '#F8FAFC', py: 1.2, width: '16%' }}>PRECIO</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', bgcolor: '#F8FAFC', py: 1.2, width: '12%' }}>STOCK</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#475569', bgcolor: '#F8FAFC', py: 1.2, width: '10%' }}>ACCIÓN</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productSearchResults.map((product, idx) => {
                  const isSelected = searchSelectedIndex === idx || selectedSearchProduct?.id === product.id;
                  return (
                    <TableRow
                      key={product.id}
                      hover
                      onClick={() => {
                        setSearchSelectedIndex(idx);
                        setSelectedSearchProduct(product);
                      }}
                      onDoubleClick={() => addSearchProductToCart(product)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isSelected ? '#EFF6FF' : undefined,
                        '&:hover': { bgcolor: isSelected ? '#DBEAFE' : '#F8FAFC' },
                        transition: 'background-color 0.1s ease',
                      }}
                    >
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.9rem', color: '#0F172A' }}>
                          {product.sku || product.barcode || '-'}
                        </Typography>
                        {product.barcode && product.sku && product.barcode !== product.sku && (
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            CB: {product.barcode}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>
                          {product.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.25, flexWrap: 'wrap' }}>
                          {product.categoryName && (
                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                              {product.categoryName}
                            </Typography>
                          )}
                          {product.saleType === 'WEIGHT' && (
                            <Chip label="Balanza / Peso" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#FEF3C7', color: '#B45309' }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.2 }}>
                        <Typography sx={{ fontWeight: 900, color: '#16A34A', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                          ${product.salePrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {product.saleType === 'WEIGHT' ? (
                            <Typography component="span" variant="caption" sx={{ color: '#64748B', ml: 0.5, fontWeight: 700 }}>
                              / kg
                            </Typography>
                          ) : null}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.2 }}>
                        {product.tracksStock === false ? (
                          <Chip label="Sin límite" size="small" sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#F1F5F9', color: '#475569' }} />
                        ) : product.stock <= 0 ? (
                          <Chip label={`0 ${product.unit || 'u.'}`} size="small" sx={{ fontWeight: 800, fontSize: '0.75rem', bgcolor: '#FEE2E2', color: '#DC2626' }} />
                        ) : product.stock <= (product.minStock || 5) ? (
                          <Chip label={`${product.stock} ${product.unit || 'u.'}`} size="small" sx={{ fontWeight: 800, fontSize: '0.75rem', bgcolor: '#FEF3C7', color: '#D97706' }} />
                        ) : (
                          <Chip label={`${product.stock} ${product.unit || 'u.'}`} size="small" sx={{ fontWeight: 800, fontSize: '0.75rem', bgcolor: '#DCFCE7', color: '#16A34A' }} />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.2 }}>
                        <Button
                          size="small"
                          variant={isSelected ? 'contained' : 'outlined'}
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            addSearchProductToCart(product);
                          }}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            textTransform: 'none',
                            px: 1.5,
                            minWidth: 70,
                          }}
                        >
                          Agregar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            px: 3,
            bgcolor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
            Mostrando <strong>{productSearchResults.length}</strong> productos
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              onClick={() => {
                setIsProductSearchOpen(false);
                focusSearchInput();
              }}
              variant="outlined"
              sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none', color: '#475569', borderColor: '#CBD5E1' }}
            >
              Cerrar (Esc)
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                const targetProduct = productSearchResults[searchSelectedIndex] || selectedSearchProduct || productSearchResults[0];
                if (targetProduct) {
                  addSearchProductToCart(targetProduct);
                }
              }}
              disabled={productSearchResults.length === 0}
              sx={{ borderRadius: 2.5, fontWeight: 800, textTransform: 'none', px: 2.5 }}
            >
              Agregar al carrito (Enter)
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(outOfStockProduct)} onClose={() => setOutOfStockProduct(null)} onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          openStockEntry();
        }
      }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Producto sin stock</DialogTitle>
        <DialogContent>
          <Typography>
            {outOfStockProduct?.name} no tiene existencias disponibles para la venta.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOutOfStockProduct(null)}>Cancelar</Button>
          <Button variant="contained" color="success" startIcon={<PackagePlus size={18} />} onClick={openStockEntry}>
            Agregar stock
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(discountTarget)} onClose={() => setDiscountTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          {discountTarget === 'GLOBAL' ? 'Descuento global del ticket' : 'Descuento del producto'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ingresá un porcentaje entre 0 y 100. El descuento global se suma a los descuentos individuales ya aplicados.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label="Descuento (%)"
            value={discountValue}
            onChange={(event) => setDiscountValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyDiscount();
            }}
            slotProps={{ htmlInput: { min: 0, max: 100, step: 0.01 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDiscountTarget(null)}>Cancelar</Button>
          <Button variant="contained" onClick={applyDiscount}>Aplicar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
