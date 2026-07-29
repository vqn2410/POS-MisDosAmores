import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { Plus, Search, Edit2, Trash2, Filter, Upload } from 'lucide-react';
import { ProductImage } from '../../components/common/ProductImage';
import type { Product } from '../../types';
import { useProducts, useDeleteProduct } from '../../hooks/useProducts';
import { ProductDrawerEditor } from './components/ProductDrawerEditor';
import { BulkProductImportDialog } from './components/BulkProductImportDialog';
import { useCategories } from '../../hooks/useCategories';

export const ProductsView: React.FC = () => {
  const { data: products = [], isLoading } = useProducts();
  const deleteProduct = useDeleteProduct();
  const { data: categories = [] } = useCategories();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm)
  );

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setSelectedProduct(p);
    setIsDrawerOpen(true);
  };

  const handleDeleteProduct = (id: string) => {
    deleteProduct.mutate(id);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A' }}>
            📦 Catálogo de Productos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Administración centralizada de inventario, código de barras y precios
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<Upload size={20} />} onClick={() => setIsImportOpen(true)} sx={{ borderRadius: 3, fontWeight: 800, minHeight: 48, px: 2.5 }}>
            Importar CSV
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={22} />}
            onClick={handleOpenCreate}
            sx={{ borderRadius: 3, fontWeight: 800, minHeight: 48, px: 3, fontSize: '1.05rem' }}
          >
            📦 Nuevo Producto
          </Button>
        </Box>
      </Box>

      {/* Filter Bar */}
      <Paper elevation={1} sx={{ p: 2.5, mb: 3, borderRadius: 4, border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF', display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          size="medium"
          placeholder="Buscar por Nombre, SKU o Código de Barras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={22} color="#2563EB" />
                </InputAdornment>
              ),
              sx: { borderRadius: 3, height: 48, fontSize: '1rem' },
            },
          }}
        />
        <Button variant="outlined" startIcon={<Filter size={20} />} sx={{ borderRadius: 3, minHeight: 48, fontWeight: 700 }}>
          Filtros Avanzados
        </Button>
      </Paper>

      {/* Products Accessible Table */}
      <Paper elevation={1} sx={{ borderRadius: 4, overflow: 'hidden', border: '2px solid', borderColor: '#E2E8F0', bgcolor: '#FFFFFF' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Imagen</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>SKU / Código</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Nombre del Producto</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Categoría</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Costo</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Precio Venta</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Existencia</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Estado</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem' }}>
                Acciones
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map((p) => (
              <TableRow key={p.id} hover sx={{ minHeight: 64 }}>
                <TableCell>
                  <ProductImage src={p.imageUrl} alt={p.name} size={44} variant="avatar" />
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>
                    {p.sku}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {p.barcode}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A' }}>{p.name}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{p.categoryName || 'General'}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>${p.costPrice.toFixed(2)}</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#2563EB', fontSize: '1.1rem' }}>${p.salePrice.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={`${p.stock} ${p.unit}`}
                    color={p.stock <= p.minStock ? 'warning' : 'default'}
                    size="medium"
                    sx={{ fontWeight: 800, fontSize: '0.85rem' }}
                  />
                </TableCell>
                <TableCell>
                  <Chip label={p.isActive ? 'Activo' : 'Inactivo'} color={p.isActive ? 'success' : 'error'} size="medium" variant="outlined" sx={{ fontWeight: 800 }} />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar Producto">
                    <IconButton size="large" onClick={() => handleOpenEdit(p)} sx={{ color: '#2563EB' }}>
                      <Edit2 size={20} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar Producto">
                    <IconButton size="large" color="error" onClick={() => handleDeleteProduct(p.id)}>
                      <Trash2 size={20} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Editor Drawer */}
      <ProductDrawerEditor product={selectedProduct} open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      <BulkProductImportDialog open={isImportOpen} onClose={() => setIsImportOpen(false)} products={products} categories={categories} />
    </Box>
  );
};
