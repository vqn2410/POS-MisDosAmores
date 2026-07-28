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
import { parseQuickVariableProduct } from './utils/parseQuickVariableProduct';


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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        if (targetProduct.saleType === 'WEIGHT') {
          setWeightModalProduct(targetProduct);
        } else {
          addProductToCart(targetProduct);
          focusSearchInput();
        }
        setSearchTerm('');
      } else {
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
  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const taxTotal = cart.reduce((acc, item) => acc + item.tax, 0);
  const discountTotal = cart.reduce((acc, item) => acc + item.subtotal * (item.discount / 100), 0);
  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const changeDue = Math.max(0, totalPaid - grandTotal);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px - 41px - 32px)',
        p: 2,
        gap: 1.5,
        bgcolor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      {/* 1. BUSCADOR SUPERMERCADO FULL-WIDTH (Alto: 60px, Fuente: 20px, Auto-Foco) */}
      <Paper elevation={1} sx={{ p: 0.5, borderRadius: 3.5, bgcolor: '#FFFFFF', border: '2px solid #2563EB' }}>
        <TextField
          inputRef={searchInputRef}
          fullWidth
          placeholder="Escanee un código de barras o escriba el código del producto"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon size={28} color="#2563EB" style={{ marginLeft: 8 }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2.5,
                      bgcolor: '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 0.5,
                    }}
                  >
                    <StoreIcon size={22} color="#2563EB" />
                  </Box>
                </InputAdornment>
              ),
              sx: {
                height: 60,
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#334155',
                '& fieldset': { border: 'none' },
              },
            },
          }}
        />
      </Paper>

      {/* 2. BARRA DE CONTEXTO (Cliente | Vendedor | Caja | Cambiar Cliente) */}
      <Paper
        elevation={0}
        sx={{
          px: 2.5,
          py: 1,
          borderRadius: 3,
          bgcolor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <User size={18} color="#64748B" />
            <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Cliente: <span style={{ fontWeight: 800 }}>{customer.name}</span>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UserCheck size={18} color="#64748B" />
            <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F172A' }}>
              Vendedor: <span style={{ fontWeight: 800 }}>{user?.fullName || 'Sin asignar'}</span>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Store size={18} color="#64748B" />
            <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F172A' }}>
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
              sx={{ height: 36, fontWeight: 700, fontSize: '0.9rem', bgcolor: '#F8FAFC' }}
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
                borderRadius: 2.5,
                bgcolor: '#EFF6FF',
                color: '#2563EB',
                borderColor: '#BFDBFE',
                fontWeight: 700,
                textTransform: 'none',
                height: 36,
                px: 2,
                '&:hover': { bgcolor: '#DBEAFE' },
              }}
            >
              Cambiar cliente
            </Button>
          )}
        </Box>
      </Paper>

      {/* 3. TICKET DE VENTA (100% ANCHO, PROTAGONISTA ABSOLUTO) */}
      <Paper
        elevation={2}
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
        }}
      >
        {/* Ticket Header Line */}
        <Box sx={{ px: 3, py: 1.5, bgcolor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.5rem' }}>
            Ticket de Venta
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={suspendSale}
              startIcon={<Pause size={16} />}
              sx={{
                borderRadius: 2.5,
                borderColor: '#E2E8F0',
                color: '#334155',
                fontWeight: 700,
                height: 38,
                px: 2,
                bgcolor: '#FFFFFF',
                '&:hover': { bgcolor: '#F8FAFC' },
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
                borderRadius: 2.5,
                borderColor: '#FCA5A5',
                color: '#DC2626',
                fontWeight: 700,
                height: 38,
                px: 2,
                bgcolor: '#FEF2F2',
                '&:hover': { bgcolor: '#FEE2E2' },
              }}
            >
              Vaciar Ticket
            </Button>

            <IconButton size="small" sx={{ color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 2.5, width: 38, height: 38 }}>
              <MoreVertical size={20} />
            </IconButton>
          </Box>
        </Box>

        {/* Scrollable Ticket Table */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          <Table stickyHeader sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', color: '#64748B', fontWeight: 800, fontSize: '0.9rem', borderBottom: '1px solid #E2E8F0' } }}>
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
                    onClick={() => setSelectedItemIndex(index)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected ? '#EFF6FF !important' : index % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                      borderLeft: isSelected ? '4px solid #2563EB' : '4px solid transparent',
                      transition: 'all 0.15s ease',
                      '&:hover': { bgcolor: isSelected ? '#DBEAFE !important' : '#F1F5F9 !important' },
                      '& td': { py: 1.75, borderBottom: '1px solid #E2E8F0' },
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

        {/* 4. PANEL INFERIOR DE RESUMEN Y TOTALES */}
        <Box sx={{ p: 3, bgcolor: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #E2E8F0', mt: 0.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A' }}>
                TOTAL
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
                p: 2.5,
                borderRadius: 3.5,
                bgcolor: '#F0FDF4',
                border: '1px solid #DCFCE7',
                minWidth: 260,
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
                p: 2.5,
                borderRadius: 3.5,
                bgcolor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                minWidth: 220,
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

      {/* 5. BARRA INFERIOR DE BOTONES DE ACCIÓN (100% ANCHO, 5 BOTONES) */}
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {/* 1. Cobrar (Solid Vibrant Blue) */}
        <Button
          fullWidth
          size="large"
          variant="contained"
          color="primary"
          onClick={openPaymentModal}
          startIcon={<CreditCard size={22} />}
          sx={{
            py: 1.75,
            borderRadius: 3,
            fontWeight: 900,
            fontSize: '1.15rem',
            minHeight: 52,
            bgcolor: '#2563EB',
            '&:hover': { bgcolor: '#1D4ED8' },
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
          sx={{
            py: 1.75,
            borderRadius: 3,
            fontWeight: 800,
            fontSize: '1.05rem',
            minHeight: 52,
            bgcolor: '#EFF6FF',
            color: '#2563EB',
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
            py: 1.75,
            borderRadius: 3,
            fontWeight: 800,
            fontSize: '1.05rem',
            minHeight: 52,
            bgcolor: '#EFF6FF',
            color: '#2563EB',
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
            py: 1.75,
            borderRadius: 3,
            fontWeight: 800,
            fontSize: '1.05rem',
            minHeight: 52,
            bgcolor: '#FFFBEB',
            color: '#D97706',
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
            py: 1.75,
            borderRadius: 3,
            fontWeight: 800,
            fontSize: '1.05rem',
            minHeight: 52,
            bgcolor: '#FEF2F2',
            color: '#DC2626',
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
    </Box>
  );
};
