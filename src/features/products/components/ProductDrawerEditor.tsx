import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Grid,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  Alert,
} from '@mui/material';
import { X as CloseIcon, Save, Image as ImageIcon, Tag, DollarSign, Package, Truck } from 'lucide-react';
import type { Product, SaleType, CashBoxType } from '../../../types';
import { useCategories } from '../../../hooks/useCategories';
import { useSuppliers } from '../../../hooks/useSuppliers';
import { useCreateProduct, useUpdateProduct, useProducts } from '../../../hooks/useProducts';
import { ProductImage } from '../../../components/common/ProductImage';

interface ProductDrawerEditorProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

const inputSlotProps = {
  htmlInput: {
    style: { color: '#0F172A', fontWeight: 800 },
  },
  sx: {
    borderRadius: 2.5,
    bgcolor: '#F8FAFC',
    color: '#0F172A',
    fontWeight: 800,
    minHeight: 56,
    fontSize: '1.1rem',
    '& input': { fontSize: '1.1rem' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#CBD5E1' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#94A3B8' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563EB', borderWidth: 2 },
  },
};

const labelSlotProps = {
  sx: {
    color: '#475569',
    fontWeight: 800,
    fontSize: '1.05rem',
    '&.Mui-focused': { color: '#2563EB' },
  },
};

export const ProductDrawerEditor: React.FC<ProductDrawerEditorProps> = ({ product, open, onClose }) => {
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: products = [] } = useProducts();

  // Form State - Empty defaults when creating a new product
  const [formData, setFormData] = React.useState<Partial<Product>>({});
  const [formError, setFormError] = React.useState('');
  const duplicateCodeRef = React.useRef('');
  const categoriesRef = React.useRef(categories);
  categoriesRef.current = categories;
  const suppliersRef = React.useRef(suppliers);
  suppliersRef.current = suppliers;

  const isCurrentProductCode = (code: string) => {
    const normalizedCode = code.trim().toLowerCase();
    return Boolean(product && (product.barcode?.trim().toLowerCase() === normalizedCode || product.sku?.trim().toLowerCase() === normalizedCode));
  };

  React.useEffect(() => {
    setFormError('');
    duplicateCodeRef.current = '';
    if (product) {
      setFormData(product);
    } else {
      // Clean empty state for new product creation (No dummy pre-filled values)
      setFormData({
        barcode: '',
        name: '',
        description: '',
        costPrice: 0,
        salePrice: 0,
        taxRate: 0,
        stock: 0,
        minStock: 0,
        unit: 'unidad',
        tracksStock: true,
        saleType: 'UNIT',
        cashBoxType: 'KIOSK',
        isActive: true,
        imageUrl: '',
        categoryId: categoriesRef.current[0]?.id || 'cat-01',
        supplierId: suppliersRef.current[0]?.id || 'sup-01',
      });
    }
  }, [product, open]);

  const handleChange = (field: keyof Product, value: any) => {
    if (field === 'barcode') {
      const code = String(value).trim().toLowerCase();
      const existingProduct = isCurrentProductCode(code)
        ? undefined
        : products.find((item) => item.id !== product?.id && (item.barcode.trim().toLowerCase() === code || item.sku.trim().toLowerCase() === code));
      if (code && existingProduct) {
        setFormError(`Producto existente: ${existingProduct.name}.`);
        if (duplicateCodeRef.current !== code) {
          duplicateCodeRef.current = code;
          try {
            const audio = new AudioContext();
            const oscillator = audio.createOscillator();
            const gain = audio.createGain();
            oscillator.type = 'square';
            oscillator.frequency.value = 180;
            gain.gain.value = 0.08;
            oscillator.connect(gain);
            gain.connect(audio.destination);
            oscillator.start();
            oscillator.stop(audio.currentTime + 0.15);
          } catch {}
        }
      } else {
        duplicateCodeRef.current = '';
        setFormError('');
      }
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const barcode = formData.barcode?.trim() || '';
    if (!barcode) {
      setFormError('El código de barras es obligatorio. Se utilizará también como SKU.');
      return;
    }
    const existingProduct = isCurrentProductCode(barcode)
      ? undefined
      : products.find((item) => item.id !== product?.id && (item.barcode.trim().toLowerCase() === barcode.toLowerCase() || item.sku.trim().toLowerCase() === barcode.toLowerCase()));
    if (existingProduct) {
      setFormError(`Producto existente: ${existingProduct.name}.`);
      return;
    }

    const preparedProduct: Omit<Product, 'id'> = {
      sku: barcode,
      barcode,
      name: formData.name?.trim() || 'Producto Sin Nombre',
      description: formData.description?.trim() || '',
      categoryId: formData.categoryId || categories[0]?.id || 'cat-01',
      categoryName: categories.find((c) => c.id === formData.categoryId)?.name || 'General',
      costPrice: Number(formData.costPrice) || 0,
      salePrice: Number(formData.salePrice) || 0,
      taxRate: Number(formData.taxRate) || 0,
      stock: Number(formData.stock) || 0,
      minStock: Number(formData.minStock) || 0,
      unit: formData.unit?.trim() || 'unidad',
      tracksStock: formData.tracksStock !== false,
      saleType: (formData.saleType as SaleType) || 'UNIT',
      cashBoxType: (formData.cashBoxType as CashBoxType) || 'KIOSK',
      isActive: formData.isActive ?? true,
      imageUrl: formData.imageUrl?.trim() || '',
      supplierId: formData.supplierId || suppliers[0]?.id || '',
      supplierName: suppliers.find((s) => s.id === formData.supplierId)?.name || '',
      createdAt: product?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (product?.id) {
      updateProduct.mutate({ id: product.id, data: preparedProduct }, { onSuccess: onClose });
    } else {
      createProduct.mutate(preparedProduct as Omit<Product, 'id'>, { onSuccess: onClose });
    }
  };

  const cost = Number(formData.costPrice) || 0;
  const sale = Number(formData.salePrice) || 0;
  const marginPercent = cost > 0 ? (((sale - cost) / cost) * 100).toFixed(1) : '0';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: '100%',
            maxWidth: 'none',
            height: '100dvh',
            bgcolor: '#FFFFFF',
            color: '#0F172A',
            p: 0,
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {/* Drawer Header */}
      <Box sx={{ px: { xs: 2, md: 5 }, py: 2.5, bgcolor: '#2563EB', color: '#FFFFFF', borderBottom: '3px solid #1D4ED8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 900, color: '#FFFFFF' }}>
          {product ? `Editar Producto: ${product.name || product.sku}` : '➕ Crear Nuevo Producto'}
        </Typography>
        <IconButton size="large" onClick={onClose} sx={{ color: '#FFFFFF' }}>
          <CloseIcon size={28} />
        </IconButton>
      </Box>

      {/* Single Scrollable Form (All sections stacked vertically in one view) */}
      <Box component="form" onSubmit={handleFormSubmit} sx={{ px: { xs: 2, md: 5 }, py: 4, flexGrow: 1, overflowY: 'auto', bgcolor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 3.5 }}>
        {formError && <Alert severity="error" sx={{ fontWeight: 700 }}>{formError}</Alert>}
        {/* Section 1: Información General */}
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, bgcolor: '#F8FAFC', borderRadius: 3.5, border: '1px solid #E2E8F0' }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 3, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tag size={24} /> 1. Información General del Producto
          </Typography>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                required
                label="Código de Barras (también será el SKU)"
                placeholder="Ej. 7791234567890"
                value={formData.barcode || ''}
                onChange={(e) => handleChange('barcode', e.target.value)}
                error={formError.startsWith('Producto existente:')}
                helperText={formError.startsWith('Producto existente:') ? formError : ''}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Nombre del Producto *"
                placeholder="Ej. Queso Cremoso de Campo"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Descripción"
                placeholder="Detalle o características del producto"
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Categoría"
                value={formData.categoryId || categories[0]?.id || ''}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id} sx={{ fontWeight: 700, color: '#0F172A' }}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Unidad de Medida"
                value={formData.unit || 'unidad'}
                onChange={(e) => handleChange('unit', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              >
                <MenuItem value="unidad" sx={{ fontWeight: 800 }}>Unidad</MenuItem>
                <MenuItem value="kg" sx={{ fontWeight: 800 }}>Kg</MenuItem>
                <MenuItem value="bulto" sx={{ fontWeight: 800 }}>Bulto</MenuItem>
                <MenuItem value="pza" sx={{ fontWeight: 800 }}>Pieza (pza) — legacy</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Tipo de Venta"
                value={formData.saleType || 'UNIT'}
                onChange={(e) => handleChange('saleType', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              >
                <MenuItem value="UNIT" sx={{ fontWeight: 800 }}>Por Unidad (UNIT)</MenuItem>
                <MenuItem value="WEIGHT" sx={{ fontWeight: 800 }}>Por Peso / Kg (WEIGHT)</MenuItem>
                <MenuItem value="VARIABLE" sx={{ fontWeight: 800 }}>Producto Vario (VARIABLE)</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Caja / Cash Box"
                value={formData.cashBoxType || 'KIOSK'}
                onChange={(e) => handleChange('cashBoxType', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              >
                <MenuItem value="KIOSK" sx={{ fontWeight: 800 }}>Kiosco</MenuItem>
                <MenuItem value="CIGARRILLOS" sx={{ fontWeight: 800 }}>Cigarrillos</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={<Switch checked={formData.isActive ?? true} onChange={(e) => handleChange('isActive', e.target.checked)} color="primary" />}
                label={<Typography sx={{ fontWeight: 800, color: '#0F172A' }}>Activo en PDV</Typography>}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={<Switch checked={formData.tracksStock !== false} onChange={(e) => handleChange('tracksStock', e.target.checked)} color="warning" />}
                label={<Typography sx={{ fontWeight: 800, color: '#0F172A' }}>Controla Stock</Typography>}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Section 2: Precios y Costos */}
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, bgcolor: '#F8FAFC', borderRadius: 3.5, border: '1px solid #E2E8F0' }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 3, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 1 }}>
            <DollarSign size={24} /> 2. Precios y Margen de Ganancia
          </Typography>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Costo de Compra ($)"
                placeholder="0.00"
                value={formData.costPrice ?? ''}
                onChange={(e) => handleChange('costPrice', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Precio de Venta ($) *"
                placeholder="0.00"
                value={formData.salePrice ?? ''}
                onChange={(e) => handleChange('salePrice', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ p: 2, bgcolor: '#DCFCE7', borderRadius: 3, border: '1px solid #86EFAC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534' }}>
                  Margen de Ganancia Calculado:
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#15803D' }}>
                  {marginPercent}%
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Section 3: Inventario y Stock (Permite ingresar sin stock o stock 0) */}
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, bgcolor: '#F8FAFC', borderRadius: 3.5, border: '1px solid #E2E8F0' }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 3, color: '#D97706', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Package size={24} /> 3. Control de Inventario y Stock
          </Typography>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Stock Inicial / Existencia (Permite 0)"
                placeholder="0"
                value={formData.stock ?? ''}
                onChange={(e) => handleChange('stock', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Stock Mínimo de Alerta"
                placeholder="0"
                value={formData.minStock ?? ''}
                onChange={(e) => handleChange('minStock', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Section 4: Proveedor e Impuestos */}
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, bgcolor: '#F8FAFC', borderRadius: 3.5, border: '1px solid #E2E8F0' }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 3, color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Truck size={24} /> 4. Proveedor y Tasa de Impuestos
          </Typography>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Proveedor Principal"
                value={formData.supplierId || suppliers[0]?.id || ''}
                onChange={(e) => handleChange('supplierId', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              >
                {suppliers.map((s) => (
                  <MenuItem key={s.id} value={s.id} sx={{ fontWeight: 700, color: '#0F172A' }}>
                    {s.name} ({s.taxId})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Tasa de IVA % (0% por defecto)"
                placeholder="0"
                value={formData.taxRate ?? ''}
                onChange={(e) => handleChange('taxRate', e.target.value)}
                slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Section 5: Imagen del Producto */}
        <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, bgcolor: '#F8FAFC', borderRadius: 3.5, border: '1px solid #E2E8F0' }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 3, color: '#0284C7', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ImageIcon size={24} /> 5. Imagen del Producto
          </Typography>

          {/* Live Preview */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <ProductImage src={formData.imageUrl || ''} alt={formData.name || 'Producto'} size={72} variant="avatar" borderRadius={3} />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                Vista previa — {formData.imageUrl ? 'Imagen personalizada' : 'Sin imagen (se mostrará ícono genérico)'}
              </Typography>
            </Box>
          </Box>

          <TextField
            fullWidth
            size="small"
            label="URL de la Imagen Principal (opcional)"
            placeholder="https://..."
            value={formData.imageUrl || ''}
            onChange={(e) => handleChange('imageUrl', e.target.value)}
            slotProps={{ input: inputSlotProps, inputLabel: labelSlotProps }}
          />
        </Paper>
      </Box>

      {/* Drawer Footer */}
      <Box sx={{ px: { xs: 2, md: 5 }, py: 2.5, bgcolor: '#F8FAFC', borderTop: '2px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} variant="outlined" size="large" sx={{ minHeight: 56, borderRadius: 3, px: 4, fontSize: '1.05rem', fontWeight: 800, color: '#475569', borderColor: '#CBD5E1' }}>
          Cancelar
        </Button>
        <Button onClick={() => handleFormSubmit()} variant="contained" size="large" startIcon={<Save size={22} />} sx={{ minHeight: 56, borderRadius: 3, px: 5, fontSize: '1.05rem', fontWeight: 900, bgcolor: '#2563EB', '&:hover': { bgcolor: '#1D4ED8' } }}>
          Guardar Cambios
        </Button>
      </Box>
    </Drawer>
  );
};
