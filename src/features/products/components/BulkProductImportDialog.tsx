import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Download, FileUp, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { CashBoxType, Category, Product, SaleType } from '../../../types';
import * as firestore from '../../../services/firestoreService';
import { useNotificationStore } from '../../../store/useNotificationStore';

interface BulkProductImportDialogProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  categories: Category[];
}

type CsvRow = Record<string, string>;

interface RejectedRow {
  rowNumber: number;
  row: CsvRow;
  reason: string;
}

const normalizeHeader = (header: string) => {
  const normalized = header
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_');

  if (['codigo_de_barras', 'codigodebarras', 'barcode', 'cod_barra'].includes(normalized)) return 'codigo_barras';
  if (['nombre_producto', 'producto', 'descripcion_producto'].includes(normalized)) return 'nombre';
  if (['precio', 'precio_venta_$', 'precio_de_venta'].includes(normalized)) return 'precio_venta';
  return normalized;
};

const parseCsv = (content: string): CsvRow[] => {
  const rows: string[][] = [];
  const firstLine = content.split(/\r?\n/, 1)[0] || '';
  const delimiter = (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ';' : ',';
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && content[index + 1] === '\n') index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((columns) => Object.fromEntries(headers.map((header, index) => [header, columns[index] || ''])));
};

const parseNumber = (value: string, field: string, rowNumber: number, required = false) => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized && !required) return 0;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) throw new Error(`Fila ${rowNumber}: ${field} debe ser un número igual o mayor a cero.`);
  return number;
};

export const BulkProductImportDialog: React.FC<BulkProductImportDialogProps> = ({ open, onClose, products, categories }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [pendingProducts, setPendingProducts] = React.useState<Omit<Product, 'id'>[]>([]);
  const [rejectedRows, setRejectedRows] = React.useState<RejectedRow[]>([]);
  const [error, setError] = React.useState('');
  const [fileName, setFileName] = React.useState('');
  const [isImporting, setIsImporting] = React.useState(false);

  const reset = () => {
    setPendingProducts([]);
    setRejectedRows([]);
    setError('');
    setFileName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    if (!isImporting) {
      reset();
      onClose();
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error('El archivo no contiene productos. Descargá el ejemplo para respetar las columnas requeridas.');

      const requiredHeaders = ['nombre', 'costo', 'precio_venta'];
      const missingHeaders = requiredHeaders.filter((header) => !(header in rows[0]));
      if (missingHeaders.length) throw new Error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}.`);
      if (!('codigo_barras' in rows[0]) && !('sku' in rows[0])) throw new Error('Falta la columna codigo_barras o SKU.');

      const existingSkus = new Set(products.map((product) => product.sku.trim().toLowerCase()).filter(Boolean));
      const existingBarcodes = new Set(products.map((product) => product.barcode.trim()).filter(Boolean));
      const importedSkus = new Set<string>();
      const importedBarcodes = new Set<string>();
      const now = new Date().toISOString();

      const parsedProducts: Omit<Product, 'id'>[] = [];
      const invalidRows: RejectedRow[] = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2;
        try {
          const barcode = row.codigo_barras?.trim() || row.sku?.trim() || '';
          const sku = barcode;
          const name = row.nombre?.trim() || '';
          if (!barcode || !name) throw new Error('código de barras (o SKU) y nombre son obligatorios.');
          if (existingSkus.has(sku.toLowerCase()) || importedSkus.has(sku.toLowerCase())) throw new Error(`el SKU "${sku}" ya existe.`);
          if (existingBarcodes.has(barcode) || importedBarcodes.has(barcode)) throw new Error(`el código de barras "${barcode}" ya existe.`);

          const saleType = (row.tipo_venta || 'UNIT').trim().toUpperCase() as SaleType;
          if (!['UNIT', 'WEIGHT', 'VARIABLE'].includes(saleType)) throw new Error('tipo_venta debe ser UNIT, WEIGHT o VARIABLE.');
          const cashBoxType = (row.caja || 'KIOSK').trim().toUpperCase() as CashBoxType;
          if (!['KIOSK', 'CIGARRILLOS'].includes(cashBoxType)) throw new Error('caja debe ser KIOSK o CIGARRILLOS.');

          const categoryValue = (row.categoria || '').trim().toLowerCase();
          const category = categories.find((item) => item.id.toLowerCase() === categoryValue || item.name.toLowerCase() === categoryValue) || categories[0];
          const activeValue = (row.activo || 'SI').trim().toUpperCase();
          if (!['SI', 'NO', 'TRUE', 'FALSE', '1', '0'].includes(activeValue)) throw new Error('activo debe ser SI o NO.');

          const product = {
            sku,
            barcode,
            name,
            description: row.descripcion?.trim() || '',
            categoryId: category?.id || 'cat-01',
            categoryName: category?.name || 'General',
            costPrice: parseNumber(row.costo || '', 'costo', rowNumber, true),
            salePrice: parseNumber(row.precio_venta || '', 'precio_venta', rowNumber, true),
            stock: parseNumber(row.stock || '', 'stock', rowNumber),
            minStock: parseNumber(row.stock_minimo || '', 'stock_minimo', rowNumber),
            taxRate: parseNumber(row.impuesto || '', 'impuesto', rowNumber),
            unit: row.unidad?.trim() || 'unidad',
            tracksStock: (row.controla_stock || 'SI').trim().toUpperCase() !== 'NO',
            saleType,
            cashBoxType,
            isActive: ['SI', 'TRUE', '1'].includes(activeValue),
            createdAt: now,
            updatedAt: now,
          };

          importedSkus.add(sku.toLowerCase());
          importedBarcodes.add(barcode);
          parsedProducts.push(product);
        } catch (rowError) {
          invalidRows.push({ rowNumber, row, reason: rowError instanceof Error ? rowError.message : 'Datos inválidos.' });
        }
      });

      setPendingProducts(parsedProducts);
      setRejectedRows(invalidRows);
      setError('');
      setFileName(file.name);
    } catch (caughtError) {
      setPendingProducts([]);
      setRejectedRows([]);
      setFileName(file.name);
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo leer el archivo CSV.');
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const chunkSize = 20;
      const importedProducts: Product[] = [];
      for (let index = 0; index < pendingProducts.length; index += chunkSize) {
        const chunk = pendingProducts.slice(index, index + chunkSize);
        const ids = await Promise.all(chunk.map((product) => firestore.create<Product>('products', product)));
        importedProducts.push(...chunk.map((product, productIndex) => ({ ...product, id: ids[productIndex] })));
      }
      queryClient.setQueryData<Product[]>(['products'], (current = []) => [...importedProducts.reverse(), ...current]);
      await queryClient.invalidateQueries({ queryKey: ['products'], refetchType: 'none' });
      addNotification({ title: 'Importación completada', message: `${pendingProducts.length} productos fueron agregados al catálogo.`, type: 'success' });
      setIsImporting(false);
      reset();
      onClose();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudieron guardar los productos.');
    } finally {
      setIsImporting(false);
    }
  };

  const addQueuedProduct = (index: number) => {
    const queued = rejectedRows[index];
    if (!queued) return;

    try {
      const barcode = queued.row.codigo_barras?.trim() || queued.row.sku?.trim() || '';
      const name = queued.row.nombre?.trim() || '';
      if (!barcode || !name) throw new Error('Completá código y nombre.');
      if (products.some((product) => product.sku.trim().toLowerCase() === barcode.toLowerCase() || product.barcode.trim() === barcode) || pendingProducts.some((product) => product.sku.toLowerCase() === barcode.toLowerCase())) {
        throw new Error('El código ya existe en el catálogo o en esta importación.');
      }

      const categoryValue = (queued.row.categoria || '').trim().toLowerCase();
      const category = categories.find((item) => item.id.toLowerCase() === categoryValue || item.name.toLowerCase() === categoryValue) || categories[0];
      const now = new Date().toISOString();
      const product: Omit<Product, 'id'> = {
        sku: barcode,
        barcode,
        name,
        description: queued.row.descripcion?.trim() || '',
        categoryId: category?.id || 'cat-01',
        categoryName: category?.name || 'General',
        costPrice: parseNumber(queued.row.costo || '0', 'costo', queued.rowNumber, true),
        salePrice: parseNumber(queued.row.precio_venta || '', 'precio_venta', queued.rowNumber, true),
        stock: parseNumber(queued.row.stock || '0', 'stock', queued.rowNumber),
        minStock: parseNumber(queued.row.stock_minimo || '0', 'stock_minimo', queued.rowNumber),
        taxRate: parseNumber(queued.row.impuesto || '0', 'impuesto', queued.rowNumber),
        unit: queued.row.unidad?.trim() || 'unidad',
        tracksStock: (queued.row.controla_stock || 'SI').trim().toUpperCase() !== 'NO',
        saleType: ['WEIGHT', 'VARIABLE'].includes((queued.row.tipo_venta || '').trim().toUpperCase()) ? (queued.row.tipo_venta.trim().toUpperCase() as SaleType) : 'UNIT',
        cashBoxType: queued.row.caja?.trim().toUpperCase() === 'CIGARRILLOS' ? 'CIGARRILLOS' : 'KIOSK',
        isActive: !['NO', 'FALSE', '0'].includes((queued.row.activo || 'SI').trim().toUpperCase()),
        createdAt: now,
        updatedAt: now,
      };
      setPendingProducts((current) => [...current, product]);
      setRejectedRows((current) => current.filter((_, itemIndex) => itemIndex !== index));
    } catch (caughtError) {
      setRejectedRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, reason: caughtError instanceof Error ? caughtError.message : 'Datos inválidos.' } : item));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Importar productos desde CSV</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Descargá el ejemplo, completalo y cargalo sin modificar los encabezados. Las categorías se buscan por nombre o ID; si no existen, se asigna la categoría predeterminada.
        </Typography>
        <Button component="a" href="/ejemplo-productos.csv" download startIcon={<Download size={18} />} sx={{ mb: 2, fontWeight: 800 }}>
          Descargar CSV de ejemplo
        </Button>
        <Divider sx={{ mb: 2 }} />
        <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
        <Button fullWidth variant="outlined" startIcon={<FileUp size={20} />} onClick={() => inputRef.current?.click()} sx={{ py: 1.5, borderStyle: 'dashed', fontWeight: 800 }}>
          Seleccionar archivo CSV
        </Button>
        {fileName && <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 700 }}>{fileName}</Typography>}
        {pendingProducts.length > 0 && <Alert severity="success" sx={{ mt: 2 }}>{pendingProducts.length} productos listos para importar.</Alert>}
        {rejectedRows.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {rejectedRows.length} filas quedaron en cola para revisión. Podés importar las válidas ahora y completar estas filas manualmente sin volver a cargar el archivo.
          </Alert>
        )}
        {rejectedRows.length > 0 && (
          <Stack spacing={1.5} sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
            {rejectedRows.map(({ rowNumber, row, reason }, index) => (
              <Stack key={rowNumber} spacing={1} sx={{ p: 1.5, border: '1px solid', borderColor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Fila {rowNumber}: {reason}</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField size="small" label="Código" value={row.codigo_barras || row.sku || ''} onChange={(event) => setRejectedRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, row: { ...item.row, codigo_barras: event.target.value, sku: event.target.value } } : item))} />
                  <TextField size="small" label="Nombre" fullWidth value={row.nombre || ''} onChange={(event) => setRejectedRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, row: { ...item.row, nombre: event.target.value } } : item))} />
                  <TextField size="small" label="Precio" value={row.precio_venta || ''} onChange={(event) => setRejectedRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, row: { ...item.row, precio_venta: event.target.value } } : item))} />
                  <Button variant="outlined" onClick={() => addQueuedProduct(index)}>Agregar</Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={isImporting}>Cancelar</Button>
        <Button variant="contained" startIcon={<Upload size={18} />} disabled={!pendingProducts.length || isImporting} onClick={handleImport}>
          {isImporting ? 'Importando...' : `Importar ${pendingProducts.length || ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
