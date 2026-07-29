import React from 'react';
import { Box, Button, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Typography } from '@mui/material';
import { PackagePlus, TriangleAlert } from 'lucide-react';
import { ProductImage } from '../../components/common/ProductImage';
import { useProducts } from '../../hooks/useProducts';
import type { Product } from '../../types';
import { StockEntryDialog } from '../products/components/StockEntryDialog';

export const StockView: React.FC = () => {
  const { data: products = [], isLoading } = useProducts();
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [isStockDialogOpen, setIsStockDialogOpen] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const lowStockProducts = products.filter((product) => product.tracksStock !== false && product.stock <= product.minStock);
  const displayedProducts = lowStockProducts.slice(page * 20, page * 20 + 20);

  if (isLoading) {
    return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', minHeight: 400 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#FFFFFF' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#0F172A' }}>Stock</Typography>
        <Typography color="text.secondary">Productos que requieren reposición.</Typography>
      </Box>
      <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '2px solid', borderColor: lowStockProducts.length ? '#FDBA74' : '#E2E8F0' }}>
        {lowStockProducts.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800 }}>No hay productos con stock bajo.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#FFF7ED' }}>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Código</TableCell>
                <TableCell>Existencia</TableCell>
                <TableCell>Stock mínimo</TableCell>
                <TableCell align="right">Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedProducts.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <ProductImage src={product.imageUrl} alt={product.name} size={40} variant="avatar" />
                      <Typography sx={{ fontWeight: 800 }}>{product.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{product.barcode || product.sku}</TableCell>
                  <TableCell><Chip icon={<TriangleAlert size={15} />} label={`${product.stock} ${product.unit}`} color="warning" size="small" /></TableCell>
                  <TableCell>{product.minStock} {product.unit}</TableCell>
                  <TableCell align="right">
                    <Button variant="contained" color="success" startIcon={<PackagePlus size={18} />} onClick={() => { setSelectedProduct(product); setIsStockDialogOpen(true); }}>
                      Agregar stock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {lowStockProducts.length > 0 && (
          <TablePagination
            component="div"
            count={lowStockProducts.length}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={20}
            rowsPerPageOptions={[20]}
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        )}
      </Paper>
      <StockEntryDialog open={isStockDialogOpen} onClose={() => setIsStockDialogOpen(false)} products={products} initialProduct={selectedProduct} />
    </Box>
  );
};
