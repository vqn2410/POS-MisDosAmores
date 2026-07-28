import React from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  ChevronRight,
  Sparkles,
  Package,
  Users,
  ShoppingCart,
} from 'lucide-react';
import { useCommandPaletteStore } from '../../store/useCommandPaletteStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useProducts } from '../../hooks/useProducts';
import { useCustomers } from '../../hooks/useCustomers';
import { useSales } from '../../hooks/useSales';

export const CommandPaletteModal: React.FC = () => {
  const { isOpen, closePalette, query, setQuery } = useCommandPaletteStore();
  const { openTab } = useWorkspaceStore();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: sales = [] } = useSales();

  const isCommandMode = query.startsWith('>');
  const cleanQuery = query.replace(/^>/, '').trim().toLowerCase();

  const COMMANDS = [
    { label: '> nueva venta', description: 'Abrir terminal POS para cobrar', action: () => openTab({ id: 'pos', title: 'Ventas (POS)', iconName: 'pos', route: '/pos', closable: true }) },
    { label: '> nuevo producto', description: 'Abrir catálogo de productos', action: () => openTab({ id: 'products', title: 'Productos', iconName: 'products', route: '/products', closable: true }) },
    { label: '> abrir inventario', description: 'Ver Kardex y movimientos de stock', action: () => openTab({ id: 'inventory', title: 'Inventario (Kardex)', iconName: 'inventory', route: '/inventory', closable: true }) },
    { label: '> corte caja', description: 'Revisar sesión y realizar arqueo de caja', action: () => openTab({ id: 'cash', title: 'Caja & Arqueo', iconName: 'cash', route: '/cash', closable: true }) },
    { label: '> ver clientes', description: 'Directorio de clientes y créditos', action: () => openTab({ id: 'customers', title: 'Clientes', iconName: 'customers', route: '/customers', closable: true }) },
    { label: '> configuraciones', description: 'Ajustes del sistema y sucursales', action: () => openTab({ id: 'settings', title: 'Configuración', iconName: 'settings', route: '/settings', closable: true }) },
  ];

  const filteredCommands = COMMANDS.filter(
    (c) => c.label.toLowerCase().includes(cleanQuery) || c.description.toLowerCase().includes(cleanQuery)
  );

  const filteredProducts = products.filter(
    (p) => p.name.toLowerCase().includes(cleanQuery) || p.sku.toLowerCase().includes(cleanQuery) || p.barcode.includes(cleanQuery)
  );

  const filteredCustomers = customers.filter(
    (c) => c.name.toLowerCase().includes(cleanQuery) || (c.taxId && c.taxId.toLowerCase().includes(cleanQuery))
  );

  const filteredSales = sales.filter(
    (s) => s.ticketNumber.toLowerCase().includes(cleanQuery) || s.customerName?.toLowerCase().includes(cleanQuery)
  );

  const handleSelectCommand = (action: () => void) => {
    action();
    closePalette();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={closePalette}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            top: -100,
          },
        },
      }}
    >
      <DialogContent sx={{ p: 2 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Busca productos, clientes, ventas o escribe un comando (ej: > nueva venta)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          variant="outlined"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  {isCommandMode ? <Sparkles size={20} color="#6366F1" /> : <SearchIcon size={20} />}
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Chip label="ESC para cerrar" size="small" variant="outlined" />
                </InputAdornment>
              ),
              sx: { borderRadius: 3, fontSize: '1rem' },
            },
          }}
        />

        <Box sx={{ mt: 2, maxH: 380, overflowY: 'auto' }}>
          {(isCommandMode || cleanQuery === '') && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, px: 1, textTransform: 'uppercase' }}>
                ⚡ Comandos Rápidos
              </Typography>
              <List dense>
                {filteredCommands.map((cmd) => (
                  <ListItem disablePadding key={cmd.label}>
                    <ListItemButton onClick={() => handleSelectCommand(cmd.action)} sx={{ borderRadius: 2, mb: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ChevronRight size={18} color="#6366F1" />
                      </ListItemIcon>
                      <ListItemText
                        primary={cmd.label}
                        secondary={cmd.description}
                        slotProps={{ primary: { sx: { fontWeight: 700, fontFamily: 'monospace' } } }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ my: 1 }} />
            </>
          )}

          {!isCommandMode && filteredProducts.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, px: 1, textTransform: 'uppercase' }}>
                📦 Productos ({filteredProducts.length})
              </Typography>
              <List dense>
                {filteredProducts.map((p) => (
                  <ListItem disablePadding key={p.id}>
                    <ListItemButton
                      onClick={() =>
                        handleSelectCommand(() =>
                          openTab({ id: 'products', title: 'Productos', iconName: 'products', route: '/products', closable: true })
                        )
                      }
                      sx={{ borderRadius: 2, mb: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Package size={18} />
                      </ListItemIcon>
                      <ListItemText
                        primary={p.name}
                        secondary={`SKU: ${p.sku} • Stock: ${p.stock} pzas • $${p.salePrice.toFixed(2)}`}
                        slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {!isCommandMode && filteredCustomers.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, px: 1, textTransform: 'uppercase', mt: 1 }}>
                👤 Clientes ({filteredCustomers.length})
              </Typography>
              <List dense>
                {filteredCustomers.map((c) => (
                  <ListItem disablePadding key={c.id}>
                    <ListItemButton
                      onClick={() =>
                        handleSelectCommand(() =>
                          openTab({ id: 'customers', title: 'Clientes', iconName: 'customers', route: '/customers', closable: true })
                        )
                      }
                      sx={{ borderRadius: 2, mb: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Users size={18} />
                      </ListItemIcon>
                      <ListItemText
                        primary={c.name}
                        secondary={`RFC: ${c.taxId || 'N/A'} • Compras: $${c.totalPurchases.toFixed(2)}`}
                        slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {!isCommandMode && filteredSales.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, px: 1, textTransform: 'uppercase', mt: 1 }}>
                🧾 Ventas ({filteredSales.length})
              </Typography>
              <List dense>
                {filteredSales.map((s) => (
                  <ListItem disablePadding key={s.id}>
                    <ListItemButton
                      onClick={() =>
                        handleSelectCommand(() =>
                          openTab({ id: 'pos', title: 'Ventas (POS)', iconName: 'pos', route: '/pos', closable: true })
                        )
                      }
                      sx={{ borderRadius: 2, mb: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ShoppingCart size={18} />
                      </ListItemIcon>
                      <ListItemText
                        primary={s.ticketNumber}
                        secondary={`Cliente: ${s.customerName} • Total: $${s.grandTotal.toFixed(2)}`}
                        slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
