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
} from 'lucide-react';
import { usePOSStore } from './store/usePOSStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useProducts } from '../../hooks/useProducts';
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
import { calculateCartTotals } from './utils/calculateCartTotals';
import { POSStockEntryModal } from './components/POSStockEntryModal';


export const POSView: React.FC = () => {
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
  const { data: customers = [] } = useCustomers();
  const { user } = useAuthStore();

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
  const [outOfStockProduct, setOutOfStockProduct] = React.useState<Product | null>(null);
  const [stockEntryProduct, setStockEntryProduct] = React.useState<Product | null>(null);

  const searchInputRef = React.useRef<HTMLInputElement>(null);

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

  // Keyboard Shortcuts Listener (F4 = Cobrar, F2 = Cliente, F6 = Suspender)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) openPaymentModal();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setIsCustomerSelectOpen((prev) => !prev);
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (cart.length > 0) suspendSale();
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

      // 1. PRIORITY 1: Detect fast expression "CANTIDAD x PRECIO" (e.g. 2x2000, 2X2000, 2 x 2000, 2,5x2000)
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

  const handleConfirmVariable = (quantity: number, unitPrice: number) => {
    addVariableProductToCart(quantity, unitPrice);
    setIsVariableModalOpen(false);
    focusSearchInput();
  };

  // Financial Summary
  const { subtotal, taxTotal, discountTotal, grandTotal } = calculateCartTotals(cart, discountGlobal);

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const changeDue = Math.max(0, totalPaid - grandTotal);

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

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px - 41px - 32px)',
        gap: 0,
        p: 0,
        bgcolor: '#D9D9D9',
        overflow: 'hidden',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <Box sx={{ px: 1, py: 0.45, bgcolor: '#2F66D0', borderTop: '1px solid #FFFFFF', borderBottom: '2px solid #1E4C9A' }}>
        <Typography sx={{ color: '#FFFFFF', fontWeight: 900, fontSize: '1.15rem', textShadow: '1px 1px #173B78' }}>
          VENTA DE PRODUCTOS · Ticket actual
        </Typography>
      </Box>

      {/* Scanner row, intentionally dense to ease migration from legacy POS terminals. */}
      <Paper elevation={0} square sx={{ p: 0.7, bgcolor: '#F3F3F3', borderBottom: '1px solid #AFAFAF', display: 'flex', alignItems: 'center', gap: 1 }}>
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
              Cambiar cliente
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
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
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

      <Box sx={{ display: 'flex', gap: 0.75, p: 0.75, bgcolor: '#ECECEC', borderTop: '1px solid #FFFFFF' }}>
        <Button
          fullWidth
          size="large"
          variant="contained"
          onClick={() => setIsStockEntryOpen(true)}
          startIcon={<PackagePlus size={20} />}
          sx={{ py: 1, borderRadius: 0.5, fontWeight: 800, fontSize: '1rem', minHeight: 42, bgcolor: '#E8F5E9', color: '#123D16', border: '1px solid #26702A', boxShadow: 'none', '&:hover': { bgcolor: '#D2EBD4' } }}
        >
          Agregar stock
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
          Cobrar
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
          Cliente
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
      <POSStockEntryModal open={isStockEntryOpen} onClose={() => { setIsStockEntryOpen(false); setStockEntryProduct(null); }} products={products} initialProduct={stockEntryProduct} />

      <Dialog open={Boolean(outOfStockProduct)} onClose={() => setOutOfStockProduct(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Producto sin stock</DialogTitle>
        <DialogContent>
          <Typography>
            {outOfStockProduct?.name} no tiene existencias disponibles para la venta.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOutOfStockProduct(null)}>Cancelar</Button>
          <Button variant="contained" color="success" startIcon={<PackagePlus size={18} />} onClick={() => {
            setStockEntryProduct(outOfStockProduct);
            setOutOfStockProduct(null);
            setIsStockEntryOpen(true);
          }}>
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
