import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Camera,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Wifi,
  Store,
  User,
  ShoppingBag,
  Search,
  ArrowRight,
} from 'lucide-react';
import { usePOSStore } from '../store/usePOSStore';
import { useNotificationStore } from '../../../store/useNotificationStore';
import { useProducts } from '../../../hooks/useProducts';
import { useAuthStore } from '../../../store/useAuthStore';
import type { Product } from '../../../types';
import { parseQuickVariableProduct } from '../utils/parseQuickVariableProduct';
import { parseQuickProductQuantity } from '../utils/parseQuickProductQuantity';
import { WeightInputModal } from './WeightInputModal';
import { VariableProductModal } from './VariableProductModal';
import { POSPaymentModal } from './POSPaymentModal';
import { POSTicketPrintModal } from './POSTicketPrintModal';
import { ProductNotFoundAlert } from './ProductNotFoundAlert';
import type { Sale } from '../../../types';

interface MobilePOSViewProps {
  onOpenScanner: () => void;
}

export const MobilePOSView: React.FC<MobilePOSViewProps> = ({ onOpenScanner }) => {
  const {
    cart,
    customer,
    addProductToCart,
    addWeightProductToCart,
    addVariableProductToCart,
    updateItemQuantity,
    removeItemFromCart,
    openPaymentModal,
  } = usePOSStore();
  const { addNotification } = useNotificationStore();
  const { data: products = [] } = useProducts();
  const { user } = useAuthStore();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [weightModalProduct, setWeightModalProduct] = React.useState<Product | null>(null);
  const [isVariableModalOpen, setIsVariableModalOpen] = React.useState(false);
  const [lastCompletedSale, setLastCompletedSale] = React.useState<Sale | null>(null);
  const [missingProductCode, setMissingProductCode] = React.useState<string | null>(null);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const ticketScrollRef = React.useRef<HTMLDivElement>(null);

  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);
  const totalItemCount = cart.reduce((acc, item) => acc + (item.saleType === 'WEIGHT' ? 1 : item.quantity), 0);

  const focusSearchInput = React.useCallback(() => {
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 50);
  }, []);

  React.useEffect(() => {
    ticketScrollRef.current?.scrollTo({ top: ticketScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [cart]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    // 1. Check quantity . product code "1.123456"
    const qtyResult = parseQuickProductQuantity(trimmed);
    if (qtyResult.isValid) {
      const qtyTargetProduct = products.find(
        (p) => p.barcode === qtyResult.code || p.sku.toLowerCase() === qtyResult.code.toLowerCase()
      );
      if (qtyTargetProduct) {
        if (qtyTargetProduct.saleType !== 'WEIGHT') {
          addProductToCart(qtyTargetProduct, qtyResult.quantity);
          addNotification({
            title: 'Producto Agregado',
            message: `${qtyTargetProduct.name} × ${qtyResult.quantity} agregado al ticket`,
            type: 'success',
          });
        } else {
          setWeightModalProduct(qtyTargetProduct);
        }
        setSearchTerm('');
        focusSearchInput();
        return;
      }
    }

    // 1c. Check quick expression "2*2000" (Producto Vario)
    const quickResult = parseQuickVariableProduct(trimmed);
    if (quickResult.isValid) {
      addVariableProductToCart(quickResult.quantity, quickResult.unitPrice);
      setSearchTerm('');
      focusSearchInput();
      addNotification({
        title: 'Producto Vario Agregado',
        message: `Producto Vario agregado: ${quickResult.quantity} × $${quickResult.unitPrice}`,
        type: 'success',
      });
      return;
    }

    // 2. Check special code "0"
    if (trimmed === '0') {
      setIsVariableModalOpen(true);
      setSearchTerm('');
      return;
    }

    // 3. Search exact barcode / SKU / name
    const targetProduct = products.find(
      (p) => p.barcode === trimmed || p.sku.toLowerCase() === trimmed.toLowerCase() || p.name.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (targetProduct) {
      if (targetProduct.saleType === 'WEIGHT') {
        setWeightModalProduct(targetProduct);
      } else {
        addProductToCart(targetProduct);
      }
      setSearchTerm('');
      focusSearchInput();
    } else {
      setMissingProductCode(trimmed);
      setSearchTerm('');
      focusSearchInput();
      addNotification({
        title: 'Producto no encontrado',
        message: `No se encontró producto para "${trimmed}"`,
        type: 'warning',
      });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px - 64px)', bgcolor: '#FFFFFF', pb: 10 }}>
      {/* 1. Compact Header */}
      <Paper elevation={0} sx={{ px: 2, py: 1.25, bgcolor: '#FFFFFF', color: '#0F172A', borderRadius: 0, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Store size={18} color="#3B82F6" />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
            Matriz Centro • Caja #1
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip icon={<Wifi size={14} color="#22C55E" />} label="Online" size="small" sx={{ bgcolor: 'rgba(34, 197, 94, 0.15)', color: '#4ADE80', fontWeight: 800, height: 24 }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#94A3B8' }}>
            <User size={14} style={{ verticalAlign: 'middle' }} /> {user?.fullName || 'Sin asignar'}
          </Typography>
        </Box>
      </Paper>

      {/* 2. Enabled Mobile Barcode / Code Search Input & Camera Scanner Trigger Button */}
      <Box sx={{ p: 2, display: 'flex', gap: 1.25, bgcolor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', alignItems: 'center' }}>
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ flexGrow: 1 }}>
          <TextField
            inputRef={searchInputRef}
            fullWidth
            placeholder="Ingresar o escanear código (ej. 779..., 2x2000)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              htmlInput: {
                enterKeyHint: 'search',
                inputMode: 'text',
              },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} color="#2563EB" style={{ marginLeft: 4 }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" type="submit" sx={{ bgcolor: '#2563EB', color: '#FFFFFF', width: 32, height: 32, mr: 0.5, '&:hover': { bgcolor: '#1D4ED8' } }}>
                      <ArrowRight size={16} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: { borderRadius: 3, height: 50, fontWeight: 700, fontSize: '0.95rem', bgcolor: '#F8FAFC', color: '#0F172A' },
              },
            }}
          />
        </Box>
        <Button
          variant="contained"
          onClick={onOpenScanner}
          startIcon={<Camera size={20} />}
          sx={{ borderRadius: 3, minWidth: 110, height: 50, fontWeight: 900, fontSize: '0.9rem', bgcolor: '#2563EB', px: 2 }}
        >
          Escanear
        </Button>
      </Box>

      {/* 3. Full-width Mobile Ticket List */}
      <Box ref={ticketScrollRef} sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingBag size={20} color="#2563EB" /> Ticket Móvil
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B' }}>
            Cliente: {customer.name}
          </Typography>
        </Box>

        {cart.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, bgcolor: '#FFFFFF', borderRadius: 4, border: '2px dashed #CBD5E1', textAlign: 'center', my: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 700 }}>
              No hay productos en el ticket
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Use la cámara o ingrese un código manualmente arriba
            </Typography>
          </Paper>
        ) : (
          cart.map((item) => (
            <Paper key={item.product.id} elevation={1} sx={{ p: 2, borderRadius: 3.5, bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A', lineHeight: 1.2 }}>
                    {item.product.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {item.saleType === 'WEIGHT' && item.weightKg ? `${item.weightKg.toFixed(3)} kg × $${item.unitPrice.toLocaleString()}/kg` : `SKU: ${item.product.sku}`}
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#2563EB' }}>
                  ${item.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>

              {/* Touch Control Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #F1F5F9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)}
                    sx={{ width: 38, height: 38, bgcolor: '#F1F5F9', color: '#0F172A', borderRadius: 2 }}
                  >
                    <Minus size={18} />
                  </IconButton>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, px: 1, minWidth: 28, textAlign: 'center' }}>
                    {item.quantity}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}
                    sx={{ width: 38, height: 38, bgcolor: '#F1F5F9', color: '#0F172A', borderRadius: 2 }}
                  >
                    <Plus size={18} />
                  </IconButton>
                </Box>

                <IconButton
                  size="small"
                  onClick={() => removeItemFromCart(item.product.id)}
                  sx={{ width: 38, height: 38, bgcolor: '#FEF2F2', color: '#DC2626', borderRadius: 2 }}
                >
                  <Trash2 size={18} />
                </IconButton>
              </Box>
            </Paper>
          ))
        )}
      </Box>

      {/* 4. Fixed Bottom Total & Cobrar Bar */}
      <Paper
        elevation={4}
        sx={{
          position: 'fixed',
          bottom: 64,
          left: 0,
          right: 0,
          p: 2,
          bgcolor: '#FFFFFF',
          borderTop: '2px solid #E2E8F0',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          zIndex: 1100,
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B' }}>
            {totalItemCount} {totalItemCount === 1 ? 'artículo' : 'artículos'}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#2563EB', lineHeight: 1.1 }}>
            ${grandTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </Typography>
        </Box>

        <Button
          variant="contained"
          disabled={cart.length === 0}
          onClick={openPaymentModal}
          startIcon={<CreditCard size={22} />}
          sx={{ borderRadius: 3, height: 52, px: 4, fontWeight: 900, fontSize: '1.1rem', bgcolor: '#2563EB' }}
        >
          COBRAR
        </Button>
      </Paper>

      {/* MODALS */}
      <WeightInputModal
        product={weightModalProduct}
        open={Boolean(weightModalProduct)}
        onClose={() => setWeightModalProduct(null)}
        onConfirm={(prod, wKg) => addWeightProductToCart(prod, wKg)}
      />

      <VariableProductModal
        open={isVariableModalOpen}
        onClose={() => setIsVariableModalOpen(false)}
        onConfirm={(qty, price) => addVariableProductToCart(qty, price)}
      />

      <POSPaymentModal onPrintTicket={(sale) => setLastCompletedSale(sale)} />
      <POSTicketPrintModal sale={lastCompletedSale} onClose={() => setLastCompletedSale(null)} />
      <ProductNotFoundAlert code={missingProductCode} onClose={() => setMissingProductCode(null)} />
    </Box>
  );
};
