import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
} from '@mui/material';
import { Search as SearchIcon, QrCode, Scale } from 'lucide-react';
import { ProductImage } from '../../../components/common/ProductImage';
import { useProducts } from '../../../hooks/useProducts';
import { useCategories } from '../../../hooks/useCategories';
import type { Product } from '../../../types';
import { usePOSStore } from '../store/usePOSStore';
import { WeightInputModal } from './WeightInputModal';
import { VariableProductModal } from './VariableProductModal';

export const POSProductGrid: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCat, setSelectedCat] = React.useState<string>('ALL');
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();

  // Modals state
  const [weightModalProduct, setWeightModalProduct] = React.useState<Product | null>(null);
  const [isVariableModalOpen, setIsVariableModalOpen] = React.useState<boolean>(false);

  const addProductToCart = usePOSStore((state) => state.addProductToCart);
  const addWeightProductToCart = usePOSStore((state) => state.addWeightProductToCart);
  const addVariableProductToCart = usePOSStore((state) => state.addVariableProductToCart);

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const focusSearchInput = React.useCallback(() => {
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 50);
  }, []);

  // Auto-focus search input upon opening new sale / mounting
  React.useEffect(() => {
    focusSearchInput();
  }, [focusSearchInput]);

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCat === 'ALL' || p.categoryId === selectedCat;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode || '').includes(searchTerm);
    return matchesCat && matchesSearch;
  });

  const handleProductSelect = (product: Product) => {
    if (product.saleType === 'WEIGHT') {
      setWeightModalProduct(product);
    } else {
      addProductToCart(product);
      focusSearchInput();
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = searchTerm.trim();
      const varCode = '0';

      // 1. Check if barcode is '0' (Producto Vario trigger)
      if (trimmed === varCode) {
        setIsVariableModalOpen(true);
        setSearchTerm('');
        return;
      }

      // 2. Exact or fuzzy match for product
      const exactMatch = products.find((p) => p.barcode === trimmed || p.sku.toLowerCase() === trimmed.toLowerCase());
      const targetProduct = exactMatch || (filteredProducts.length > 0 ? filteredProducts[0] : null);

      if (targetProduct) {
        if (targetProduct.saleType === 'WEIGHT') {
          setWeightModalProduct(targetProduct);
        } else {
          addProductToCart(targetProduct);
        }
        setSearchTerm('');
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      {/* Auto-focused Search Input & HID Scanner Listener */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <TextField
          inputRef={searchInputRef}
          fullWidth
          size="medium"
          placeholder="Escanear código de barras (ej. '0' para Producto Vario) o buscar SKU/Nombre... (ENTER)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon size={22} color="#2563EB" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Chip icon={<QrCode size={16} />} label="Scanner Activo" size="small" color="primary" sx={{ fontWeight: 800 }} />
                </InputAdornment>
              ),
              sx: { borderRadius: 3, bgcolor: '#FFFFFF', height: 52, fontSize: '1.1rem', fontWeight: 600 },
            },
          }}
        />
      </Box>

      {/* Category Pills (High contrast & min-height 44px) */}
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 2 }}>
        <Button
          size="large"
          variant={selectedCat === 'ALL' ? 'contained' : 'outlined'}
          onClick={() => setSelectedCat('ALL')}
          sx={{ borderRadius: 3, minWidth: 90, minHeight: 44, fontWeight: 800, fontSize: '0.95rem' }}
        >
          Todos
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            size="large"
            variant={selectedCat === cat.id ? 'contained' : 'outlined'}
            onClick={() => setSelectedCat(cat.id)}
            sx={{ borderRadius: 3, minHeight: 44, fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}
          >
            {cat.name}
          </Button>
        ))}
      </Box>

      {/* Product Cards Grid */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 0.5 }}>
        <Grid container spacing={2}>
          {filteredProducts.map((product) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={product.id}>
              <Card
                onClick={() => handleProductSelect(product)}
                sx={{
                  borderRadius: 3.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '2px solid',
                  borderColor: product.saleType === 'WEIGHT' ? '#8B5CF6' : '#E2E8F0',
                  bgcolor: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.18)',
                    borderColor: '#2563EB',
                  },
                }}
              >
                {product.saleType === 'WEIGHT' && (
                  <Chip
                    icon={<Scale size={12} />}
                    label="Por Kg"
                    color="secondary"
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, fontWeight: 800, height: 22, fontSize: '0.7rem' }}
                  />
                )}
                <ProductImage src={product.imageUrl} alt={product.name} height={120} variant="card" />
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, height: 42, overflow: 'hidden', color: '#0F172A' }}>
                    {product.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                    SKU: {product.sku}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#2563EB', fontSize: '1.25rem' }}>
                      ${product.salePrice.toLocaleString()} {product.saleType === 'WEIGHT' ? '/Kg' : ''}
                    </Typography>
                    <Chip label={`${product.stock} ${product.unit}`} size="small" sx={{ fontWeight: 800, height: 24, fontSize: '0.75rem' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Modals */}
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
    </Box>
  );
};
