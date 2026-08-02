import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import { ProductImage } from '../../components/common/ProductImage';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Wallet,
  AlertTriangle,
  PackageX,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useProducts } from '../../hooks/useProducts';
import { useSales } from '../../hooks/useSales';
import { useCurrentCashSession, useCashMovements } from '../../hooks/useCashSessions';
import { useCustomers } from '../../hooks/useCustomers';
import type { Product, Sale, CartItem } from '../../types';

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(value as string);
}

export const DashboardView: React.FC = () => {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: cashSession } = useCurrentCashSession();
  const { data: movements = [] } = useCashMovements(cashSession?.id);
  const { data: customers = [] } = useCustomers();

  const todaySales = sales.filter((s) => {
    const saleDate = toDate(s.createdAt);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString() && s.status === 'COMPLETED';
  });

  const itemQty = (i: CartItem) => (i.saleType === 'WEIGHT' && i.weightKg ? i.weightKg : i.quantity);

  const totalRevenue = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalItems = todaySales.reduce((sum, s) => sum + s.items.reduce((isum, i) => isum + itemQty(i), 0), 0);
  const totalCost = todaySales.reduce((sum, s) => sum + s.items.reduce((isum, i) => isum + ((i.product.costPrice || 0) * itemQty(i)), 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const outOfStockProducts = products.filter((p) => p.stock === 0);
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);

  // Caja actual: fondo inicial + ventas en efectivo del turno + movimientos (mismo calculo que el arqueo)
  const sessionSales = sales.filter((s) => s.cashSessionId === cashSession?.id && s.status === 'COMPLETED');
  const cashOf = (s: Sale) =>
    (s.payments || []).filter((p) => p.method === 'CASH').reduce((acc, p) => acc + (p.amount - (p.change || 0)), 0);
  const kioskCashSales = sessionSales.reduce((sum, s) => {
    const kioskTotal = s.items
      .filter((i) => i.product.cashBoxType === 'KIOSK' || !i.product.cashBoxType)
      .reduce((acc, i) => acc + i.total, 0);
    const share = s.subtotal > 0 ? kioskTotal / s.subtotal : 0;
    return sum + cashOf(s) * share;
  }, 0);
  const cigaretteCashSales = sessionSales.reduce((sum, s) => {
    const cigTotal = s.items
      .filter((i) => i.product.cashBoxType === 'CIGARRILLOS')
      .reduce((acc, i) => acc + i.total, 0);
    const share = s.subtotal > 0 ? cigTotal / s.subtotal : 0;
    return sum + cashOf(s) * share;
  }, 0);
  const netIncome = movements.filter((m) => m.status !== 'CANCELLED' && m.type === 'INCOME').reduce((sum, m) => sum + m.amount, 0);
  const netWithdrawals = movements.filter((m) => m.status !== 'CANCELLED' && m.type === 'WITHDRAWAL').reduce((sum, m) => sum + m.amount, 0);
  const totalCashInDrawer = cashSession
    ? cashSession.initialKioskAmount + cashSession.initialCigaretteAmount + kioskCashSales + cigaretteCashSales + netIncome - netWithdrawals
    : 0;

  const topProducts = (() => {
    const map = new Map<string, { product: Product; quantity: number; total: number }>();
    for (const s of todaySales) {
      for (const i of s.items) {
        const row = map.get(i.product.id) || { product: i.product, quantity: 0, total: 0 };
        row.quantity += itemQty(i);
        row.total += i.total;
        map.set(i.product.id, row);
      }
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 4);
  })();

  const chartData = (() => {
    const slots = [
      { label: '08:00', min: 0, max: 9 },
      { label: '10:00', min: 9, max: 11 },
      { label: '12:00', min: 11, max: 13 },
      { label: '14:00', min: 13, max: 15 },
      { label: '16:00', min: 15, max: 17 },
      { label: '18:00', min: 17, max: 24 },
    ];
    return slots.map((slot) => {
      const filtered = todaySales.filter((s) => {
        const h = toDate(s.createdAt).getHours();
        return h >= slot.min && h < slot.max;
      });
      const ventas = filtered.reduce((sum, s) => sum + s.grandTotal, 0);
      const utilidad = filtered.reduce((sum, s) => {
        const cost = s.items.reduce((acc, i) => acc + ((i.product.costPrice || 0) * itemQty(i)), 0);
        return sum + (s.grandTotal - cost);
      }, 0);
      return { time: slot.label, ventas, utilidad };
    });
  })();

  const isLoading = productsLoading || salesLoading;

  const Kpis = [
    { title: 'Ventas del Dia', value: `$${totalRevenue.toFixed(2)}`, change: `${todaySales.length} ventas`, isPositive: true, icon: DollarSign, color: '#2563EB' },
    { title: 'Productos Vendidos', value: `${totalItems.toFixed(1)}`, change: `${todaySales.length} tickets`, isPositive: true, icon: ShoppingCart, color: '#16A34A' },
    { title: 'Utilidad Neta', value: `$${totalProfit.toFixed(2)}`, change: totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}% margen` : 'Sin datos', isPositive: totalProfit >= 0, icon: TrendingUp, color: '#7C3AED' },
    { title: 'Caja Actual', value: `$${totalCashInDrawer.toFixed(2)}`, change: cashSession ? 'Turno Abierto' : 'Sin sesion', isPositive: !!cashSession, icon: Wallet, color: '#D97706' },
    { title: 'Clientes Registrados', value: `${customers.length}`, change: `${customers.length} en directorio`, isPositive: true, icon: ShoppingCart, color: '#0284C7' },
    { title: 'Productos Agotados', value: `${outOfStockProducts.length} items`, change: outOfStockProducts.length > 0 ? 'Atencion' : 'OK', isPositive: outOfStockProducts.length === 0, icon: PackageX, color: '#DC2626' },
    { title: 'Stock Minimo Alerta', value: `${lowStockProducts.length} items`, change: lowStockProducts.length > 0 ? 'Reorden' : 'OK', isPositive: lowStockProducts.length === 0, icon: AlertTriangle, color: '#D97706' },
    { title: 'Total Productos', value: `${products.length}`, change: `${products.filter((p) => p.isActive).length} activos`, isPositive: true, icon: Clock, color: '#2563EB' },
  ];

  if (isLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      {/* Welcome Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3.5,
          mb: 3.5,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5, fontSize: '1.75rem' }}>
            Bienvenido a Nexus POS Enterprise!
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.95, fontSize: '1.1rem' }}>
            Resumen en tiempo real del comercio
          </Typography>
        </Box>
        <Chip
          icon={<Sparkles size={18} color="#FFFFFF" />}
          label="Operativo 100%"
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', fontWeight: 800, fontSize: '0.95rem', height: 38 }}
        />
      </Paper>

      {/* KPI Grid */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {Kpis.map((kpi, idx) => {
          const IconComponent = kpi.icon;
          return (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
              <Paper
                elevation={1}
                sx={{
                  p: 3,
                  borderRadius: 3.5,
                  bgcolor: '#FFFFFF',
                  border: '2px solid',
                  borderColor: '#E2E8F0',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                    borderColor: kpi.color,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                    {kpi.title}
                  </Typography>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 3,
                      bgcolor: `${kpi.color}15`,
                      color: kpi.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconComponent size={24} />
                  </Box>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: '#0F172A', fontSize: '1.85rem' }}>
                  {kpi.value}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Chip
                    label={kpi.change}
                    size="small"
                    sx={{
                      bgcolor: kpi.isPositive ? '#16A34A' : '#DC2626',
                      color: '#FFFFFF',
                      height: 24,
                      fontSize: '0.8rem',
                      fontWeight: 800,
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Main Analytical Section */}
      <Grid container spacing={3}>
        {/* Sales Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper elevation={1} sx={{ p: 3.5, borderRadius: 4, height: '100%', bgcolor: '#FFFFFF', border: '2px solid #E2E8F0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#0F172A' }}>
                  Curva de Ventas & Utilidad
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Comportamiento horario de la jornada activa
                </Typography>
              </Box>
              <Chip label="Hoy en vivo" color="primary" size="small" variant="outlined" sx={{ fontWeight: 800, height: 32 }} />
            </Box>
            <Box sx={{ height: 320, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorUtilidad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="time" stroke="#64748B" fontSize={14} fontWeight={600} />
                  <YAxis stroke="#64748B" fontSize={14} fontWeight={600} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.12)' }}
                  />
                  <Area type="monotone" dataKey="ventas" name="Ventas ($)" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                  <Area type="monotone" dataKey="utilidad" name="Utilidad ($)" stroke="#16A34A" strokeWidth={3} fillOpacity={1} fill="url(#colorUtilidad)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Top Products */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper elevation={1} sx={{ p: 3.5, borderRadius: 4, height: '100%', bgcolor: '#FFFFFF', border: '2px solid #E2E8F0' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, color: '#0F172A' }}>
              Top Productos
            </Typography>
            <List dense disablePadding>
              {topProducts.length === 0 ? (
                <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: '#64748B' }}>
                  Sin ventas registradas hoy
                </Typography>
              ) : (
                topProducts.map(({ product, quantity, total }, index) => (
                  <React.Fragment key={product.id}>
                    <ListItem disableGutters sx={{ py: 1.5 }}>
                      <ListItemAvatar>
                        <ProductImage src={product.imageUrl} alt={product.name} size={48} variant="avatar" />
                      </ListItemAvatar>
                      <ListItemText
                        primary={product.name}
                        secondary={`${Number.isInteger(quantity) ? quantity : quantity.toFixed(1)} vendidos - $${total.toFixed(2)}`}
                        slotProps={{
                          primary: { variant: 'subtitle1', sx: { fontWeight: 800, fontSize: '1rem', color: '#0F172A' } },
                          secondary: { variant: 'body2', sx: { color: '#64748B' } },
                        }}
                      />
                      <Box sx={{ textAlign: 'right', pl: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: '#2563EB' }}>
                          ${product.salePrice.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          #{index + 1}
                        </Typography>
                      </Box>
                    </ListItem>
                    {index < 3 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
