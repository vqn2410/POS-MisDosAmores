import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Select,
  MenuItem,
  TextField,
  Divider,
  Badge,
  Chip,
} from '@mui/material';
import {
  Trash2,
  Plus,
  Minus,
  User,
  Pause,
  RotateCcw,
  CheckCircle2,
  Tag,
  XCircle,
  Percent,
  Scale,
  ShoppingBag,
} from 'lucide-react';
import { usePOSStore } from '../store/usePOSStore';

interface POSTicketPanelProps {
  onOpenSuspendedModal: () => void;
}

export const POSTicketPanel: React.FC<POSTicketPanelProps> = ({ onOpenSuspendedModal }) => {
  const {
    cart,
    customer,
    setCustomer,
    updateItemQuantity,
    updateItemDiscount,
    removeItemFromCart,
    clearCart,
    suspendSale,
    suspendedSales,
    openPaymentModal,
    selectedItemIndex,
    setSelectedItemIndex,
  } = usePOSStore();

  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const taxTotal = cart.reduce((acc, item) => acc + item.tax, 0);
  const discountTotal = cart.reduce((acc, item) => acc + (item.subtotal * (item.discount / 100)), 0);
  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);

  return (
    <Paper
      elevation={2}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        border: '2px solid',
        borderColor: 'divider',
        bgcolor: '#FFFFFF',
      }}
    >
      {/* Ticket Header & Always Visible Action Bar */}
      <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderBottom: '2px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.25rem', color: '#1E293B' }}>
            🧾 Ticket de Venta
          </Typography>

          {/* Large Action Buttons (min-height 48px) */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Badge badgeContent={suspendedSales.length} color="warning">
              <Button
                size="large"
                variant="outlined"
                startIcon={<RotateCcw size={18} />}
                onClick={onOpenSuspendedModal}
                sx={{ borderRadius: 3, minHeight: 44, fontWeight: 700, px: 2 }}
              >
                Pausadas
              </Button>
            </Badge>

            <Button
              size="large"
              variant="outlined"
              color="warning"
              disabled={cart.length === 0}
              onClick={suspendSale}
              startIcon={<Pause size={18} />}
              sx={{ borderRadius: 3, minHeight: 44, fontWeight: 700 }}
            >
              Pausar
            </Button>

            <Button
              size="large"
              variant="outlined"
              color="error"
              disabled={cart.length === 0}
              onClick={clearCart}
              startIcon={<XCircle size={18} />}
              sx={{ borderRadius: 3, minHeight: 44, fontWeight: 700 }}
            >
              Cancelar
            </Button>
          </Box>
        </Box>

        {/* Customer Select Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <User size={20} color="#2563EB" />
          <Select
            size="small"
            fullWidth
            value={customer.id}
            onChange={(e) => {
              const selected = mockCustomers.find((c) => c.id === e.target.value);
              if (selected) setCustomer(selected);
            }}
            sx={{ borderRadius: 2.5, fontSize: '1rem', fontWeight: 700, height: 48, bgcolor: '#FFFFFF' }}
          >
            {mockCustomers.map((c) => (
              <MenuItem key={c.id} value={c.id} sx={{ fontSize: '1rem', fontWeight: 600 }}>
                👤 {c.name} {c.taxId ? `(${c.taxId})` : ''}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>

      {/* Cart Items List */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: '#FFFFFF' }}>
        {cart.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#64748B' }}>
              El carrito de venta está vacío
            </Typography>
            <Typography variant="body1">Escanea un código de barras (ej. '0' para Producto Vario) o selecciona un producto</Typography>
          </Box>
        ) : (
          cart.map((item, index) => {
            const isSelected = index === selectedItemIndex;
            return (
              <Paper
                key={item.product.id}
                elevation={isSelected ? 2 : 0}
                onClick={() => setSelectedItemIndex(index)}
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: 3,
                  cursor: 'pointer',
                  bgcolor: isSelected ? '#EFF6FF' : '#F8FAFC',
                  border: isSelected ? '2px solid #2563EB' : '1px solid',
                  borderColor: isSelected ? '#2563EB' : item.saleType === 'WEIGHT' ? '#8B5CF6' : item.isVariableProduct ? '#D8B4FE' : '#E2E8F0',
                  transition: 'all 0.15s ease',
                }}
              >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.05rem' }}>
                    {item.product.name}
                  </Typography>

                  {/* Weight or Variable product description line */}
                  {item.saleType === 'WEIGHT' && item.weightKg && (
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <Scale size={14} /> {item.weightKg.toFixed(3)} Kg × ${item.unitPrice.toLocaleString()} / Kg
                    </Typography>
                  )}

                  {item.isVariableProduct && (
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#6B21A8', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <ShoppingBag size={14} /> {item.quantity} × ${item.unitPrice.toLocaleString()} (Venta Ocasional)
                    </Typography>
                  )}
                </Box>

                <IconButton size="small" color="error" onClick={() => removeItemFromCart(item.product.id)} sx={{ ml: 1 }}>
                  <Trash2 size={18} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                {/* Quantity Controls (Disabled for WEIGHT, enabled for UNIT/VARIABLE) */}
                {item.saleType === 'WEIGHT' ? (
                  <Chip
                    icon={<Scale size={14} />}
                    label={`${item.weightKg?.toFixed(3)} Kg`}
                    color="secondary"
                    size="small"
                    sx={{ fontWeight: 800, fontSize: '0.85rem', height: 32 }}
                  />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#FFFFFF', borderRadius: 3, p: 0.5, border: '1px solid #CBD5E1' }}>
                    <IconButton size="small" onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)}>
                      <Minus size={18} />
                    </IconButton>
                    <Typography variant="h6" sx={{ px: 1.5, fontWeight: 900, minWidth: 32, textAlign: 'center' }}>
                      {item.quantity}
                    </Typography>
                    <IconButton size="small" onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}>
                      <Plus size={18} />
                    </IconButton>
                  </Box>
                )}

                {/* Discount % */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Tag size={16} color="#64748B" />
                  <TextField
                    size="small"
                    type="number"
                    value={item.discount}
                    onChange={(e) => updateItemDiscount(item.product.id, Number(e.target.value))}
                    slotProps={{
                      htmlInput: { min: 0, max: 100, style: { padding: '6px 8px', fontSize: '0.9rem', width: 45, fontWeight: 700 } },
                    }}
                  />
                  <Percent size={14} color="#64748B" />
                </Box>

                {/* Subtotal Item */}
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#2563EB' }}>
                  ${item.total.toFixed(2)}
                </Typography>
              </Box>
            </Paper>
            );
          })
        )}
      </Box>

      {/* Prominent Summary Footer with Total >= 36px & Big Button (Min 48px height) */}
      <Box sx={{ p: 2.5, bgcolor: '#F8FAFC', borderTop: '2px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
          <Typography variant="body1" sx={{ fontWeight: 800, color: '#475569', fontSize: '1.05rem' }}>
            Subtotal:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.05rem' }}>
            ${subtotal.toFixed(2)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
          <Typography variant="body1" sx={{ fontWeight: 800, color: '#475569', fontSize: '1.05rem' }}>
            IVA (16%):
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.05rem' }}>
            ${taxTotal.toFixed(2)}
          </Typography>
        </Box>

        {discountTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography variant="body1" color="error.main" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
              Descuentos:
            </Typography>
            <Typography variant="body1" color="error.main" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
              -${discountTotal.toFixed(2)}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* PROMINENT TOTAL DISPLAY (>= 36px) */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
            TOTAL:
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, color: '#2563EB', fontSize: '2.5rem' }}>
            ${grandTotal.toFixed(2)}
          </Typography>
        </Box>

        {/* GIANT CHECKOUT BUTTON (MIN-HEIGHT 56px, BUTTON TEXT 18px) */}
        <Button
          fullWidth
          size="large"
          variant="contained"
          color="primary"
          disabled={cart.length === 0}
          onClick={openPaymentModal}
          startIcon={<CheckCircle2 size={28} />}
          sx={{
            py: 2,
            minHeight: 56,
            borderRadius: 3.5,
            fontSize: '1.25rem',
            fontWeight: 900,
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
          }}
        >
          💳 COBRAR (ENTER)
        </Button>
      </Box>
    </Paper>
  );
};
