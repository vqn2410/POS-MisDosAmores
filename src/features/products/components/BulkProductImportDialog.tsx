import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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

const parseCsv = (content: string): CsvRow[] => {
  const rows: string[][] = [];
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
    } else if (character === ',' && !quoted) {
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

  const headers = rows[0].map((header) => header.toLowerCase().replace(/^\uFEFF/, '').trim());
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
  const [error, setError] = React.useState('');
  const [fileName, setFileName] = React.useState('');
  const [isImporting, setIsImporting] = React.useState(false);

  const reset = () => {
    setPendingProducts([]);
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

      const requiredHeaders = ['sku', 'nombre', 'costo', 'precio_venta'];
      const missingHeaders = requiredHeaders.filter((header) => !(header in rows[0]));
      if (missingHeaders.length) throw new Error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}.`);

      const existingSkus = new Set(products.map((product) => product.sku.trim().toLowerCase()).filter(Boolean));
      const existingBarcodes = new Set(products.map((product) => product.barcode.trim()).filter(Boolean));
      const importedSkus = new Set<string>();
      const importedBarcodes = new Set<string>();
      const now = new Date().toISOString();

      const parsedProducts = rows.map((row, index) => {
        const rowNumber = index + 2;
        const sku = row.sku.trim();
        const barcode = row.codigo_barras.trim();
        const name = row.nombre.trim();
        if (!sku || !name) throw new Error(`Fila ${rowNumber}: SKU y nombre son obligatorios.`);
        if (existingSkus.has(sku.toLowerCase()) || importedSkus.has(sku.toLowerCase())) throw new Error(`Fila ${rowNumber}: el SKU "${sku}" ya existe.`);
        if (barcode && (existingBarcodes.has(barcode) || importedBarcodes.has(barcode))) throw new Error(`Fila ${rowNumber}: el código de barras "${barcode}" ya existe.`);

        const saleType = (row.tipo_venta || 'UNIT').trim().toUpperCase() as SaleType;
        if (!['UNIT', 'WEIGHT', 'VARIABLE'].includes(saleType)) throw new Error(`Fila ${rowNumber}: tipo_venta debe ser UNIT, WEIGHT o VARIABLE.`);
        const cashBoxType = (row.caja || 'KIOSK').trim().toUpperCase() as CashBoxType;
        if (!['KIOSK', 'CIGARRILLOS'].includes(cashBoxType)) throw new Error(`Fila ${rowNumber}: caja debe ser KIOSK o CIGARRILLOS.`);

        const categoryValue = (row.categoria || '').trim().toLowerCase();
        const category = categories.find((item) => item.id.toLowerCase() === categoryValue || item.name.toLowerCase() === categoryValue) || categories[0];
        const activeValue = (row.activo || 'SI').trim().toUpperCase();
        if (!['SI', 'NO', 'TRUE', 'FALSE', '1', '0'].includes(activeValue)) throw new Error(`Fila ${rowNumber}: activo debe ser SI o NO.`);

        importedSkus.add(sku.toLowerCase());
        if (barcode) importedBarcodes.add(barcode);

        return {
          sku,
          barcode,
          name,
          description: row.descripcion.trim(),
          categoryId: category?.id || 'cat-01',
          categoryName: category?.name || 'General',
          costPrice: parseNumber(row.costo, 'costo', rowNumber, true),
          salePrice: parseNumber(row.precio_venta, 'precio_venta', rowNumber, true),
          stock: parseNumber(row.stock, 'stock', rowNumber),
          minStock: parseNumber(row.stock_minimo, 'stock_minimo', rowNumber),
          taxRate: parseNumber(row.impuesto, 'impuesto', rowNumber),
          unit: row.unidad.trim() || 'unidad',
          tracksStock: (row.controla_stock || 'SI').trim().toUpperCase() !== 'NO',
          saleType,
          cashBoxType,
          isActive: ['SI', 'TRUE', '1'].includes(activeValue),
          createdAt: now,
          updatedAt: now,
        };
      });

      setPendingProducts(parsedProducts);
      setError('');
      setFileName(file.name);
    } catch (caughtError) {
      setPendingProducts([]);
      setFileName(file.name);
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo leer el archivo CSV.');
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const chunkSize = 20;
      for (let index = 0; index < pendingProducts.length; index += chunkSize) {
        await Promise.all(pendingProducts.slice(index, index + chunkSize).map((product) => firestore.create<Product>('products', product)));
      }
      await queryClient.invalidateQueries({ queryKey: ['products'] });
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
