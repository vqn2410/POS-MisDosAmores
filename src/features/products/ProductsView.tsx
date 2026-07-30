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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TablePagination,
} from '@mui/material';
import { Plus, Search, Edit2, Trash2, Filter, Upload, PackagePlus, Tags, Scale } from 'lucide-react';
import { ProductImage } from '../../components/common/ProductImage';
import type { Product } from '../../types';
import { useProducts, useDeleteProduct } from '../../hooks/useProducts';
import { ProductDrawerEditor } from './components/ProductDrawerEditor';
import { BulkProductImportDialog } from './components/BulkProductImportDialog';
import { useCategories, useCreateCategory } from '../../hooks/useCategories';
import { StockEntryDialog } from './components/StockEntryDialog';
import { useNotificationStore } from '../../store/useNotificationStore';
import * as fs from '../../services/firestoreService';

const FIAMBRE_CODES = new Set([
  '700', '701', '702', '703', '704', '705', '706', '707', '708', '709', '710', '711', '712', '713', '714',
  '715', '716', '717', '718', '719', '720', '721', '722', '723', '724', '730', '731', '732', '733', '734',
]);

export const ProductsView: React.FC = () => {
  const { data: products = [], isLoading, refetch: refetchProducts } = useProducts();
  const deleteProduct = useDeleteProduct();
  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const { addNotification } = useNotificationStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [stockProduct, setStockProduct] = React.useState<Product | null>(null);
  const [isStockDialogOpen, setIsStockDialogOpen] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState('');
  const [categoryDescription, setCategoryDescription] = React.useState('');
  const [isConfiguringFiambres, setIsConfiguringFiambres] = React.useState(false);

  const filteredProducts = products.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode || '').includes(searchTerm)
  );
  const displayedProducts = filteredProducts.slice(page * 20, page * 20 + 20);

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

  const handleCreateCategory = async () => {
    const name = categoryName.trim();
    if (!name) return;
    if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      addNotification({ title: 'Categoría existente', message: 'Ya existe una categoría con ese nombre.', type: 'warning' });
      return;
    }
    try {
      await createCategory.mutateAsync({ name, description: categoryDescription.trim() || undefined });
      addNotification({ title: 'Categoría creada', message: `${name} ya está disponible para asignar a productos.`, type: 'success' });
      setCategoryName('');
      setCategoryDescription('');
      setIsCategoryDialogOpen(false);
    } catch {
      addNotification({ title: 'Error', message: 'No se pudo crear la categoría.', type: 'error' });
    }
  };

  const handleConfigureFiambres = async () => {
    setIsConfiguringFiambres(true);
    try {
      let fiambreCategory = categories.find((category) => category.name.toLowerCase() === 'fiambre');
      if (!fiambreCategory) {
        const id = await createCategory.mutateAsync({ name: 'Fiambre', description: 'Fiambres y quesos vendidos a granel' });
        fiambreCategory = { id, name: 'Fiambre' };
      }

      const matches = products.filter((product) => FIAMBRE_CODES.has(product.sku) || FIAMBRE_CODES.has(product.barcode));
      if (matches.length === 0) {
        addNotification({ title: 'No se encontraron productos', message: 'No hay productos cargados con los códigos de fiambre indicados.', type: 'warning' });
        return;
      }

      await fs.updateMany<Product>('products', matches.map((product) => ({
        id: product.id,
        data: { categoryId: fiambreCategory.id, categoryName: 'Fiambre', saleType: 'WEIGHT', unit: 'kg', tracksStock: false },
      })));
      await refetchProducts();
      addNotification({ title: 'Fiambres actualizados', message: `${matches.length} productos conservan su precio por kilo y no controlan stock.`, type: 'success' });
    } catch {
      addNotification({ title: 'Error', message: 'No se pudieron actualizar los productos de fiambre.', type: 'error' });
    } finally {
      setIsConfiguringFiambres(false);
    }
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
          <Button variant="outlined" startIcon={<Tags size={20} />} onClick={() => setIsCategoryDialogOpen(true)} sx={{ borderRadius: 3, fontWeight: 800, minHeight: 48, px: 2.5 }}>
            Categorías
          </Button>
          <Button variant="outlined" color="secondary" startIcon={<Scale size={20} />} onClick={() => void handleConfigureFiambres()} disabled={isConfiguringFiambres} sx={{ borderRadius: 3, fontWeight: 800, minHeight: 48, px: 2.5 }}>
            {isConfiguringFiambres ? 'Actualizando...' : 'Configurar fiambres'}
          </Button>
          <Button variant="contained" color="success" startIcon={<PackagePlus size={20} />} onClick={() => { setStockProduct(null); setIsStockDialogOpen(true); }} sx={{ borderRadius: 3, fontWeight: 800, minHeight: 48, px: 2.5 }}>
            Agregar stock
          </Button>
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
          placeholder="Buscar por nombre o código de barras..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
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
              <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>Código de barras</TableCell>
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
            {displayedProducts.map((p) => (
              <TableRow key={p.id} hover sx={{ minHeight: 64 }}>
                <TableCell>
                  <ProductImage src={p.imageUrl} alt={p.name} size={44} variant="avatar" />
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>
                    {p.barcode || p.sku}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    SKU: {p.barcode || p.sku}
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
                  <Tooltip title="Agregar stock">
                    <IconButton size="large" onClick={() => { setStockProduct(p); setIsStockDialogOpen(true); }} sx={{ color: '#15803D' }}>
                      <PackagePlus size={20} />
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
        <TablePagination
          component="div"
          count={filteredProducts.length}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={20}
          rowsPerPageOptions={[20]}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {/* Editor Drawer */}
      <ProductDrawerEditor product={selectedProduct} open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      <BulkProductImportDialog open={isImportOpen} onClose={() => setIsImportOpen(false)} products={products} categories={categories} />
      <StockEntryDialog open={isStockDialogOpen} onClose={() => setIsStockDialogOpen(false)} products={products} initialProduct={stockProduct} />
      <Dialog open={isCategoryDialogOpen} onClose={() => !createCategory.isPending && setIsCategoryDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Crear categoría</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField autoFocus label="Nombre" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleCreateCategory(); }} />
          <TextField label="Descripción (opcional)" multiline minRows={2} value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsCategoryDialogOpen(false)} disabled={createCategory.isPending}>Cancelar</Button>
          <Button variant="contained" onClick={() => void handleCreateCategory()} disabled={!categoryName.trim() || createCategory.isPending}>
            {createCategory.isPending ? 'Guardando...' : 'Crear categoría'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
