import type {
  Product,
  Category,
  Customer,
  Supplier,
  Sale,
  Branch,
  CashSession,
  User,
  KardexMovement,
  ElectronicInvoice,
  AuditLog,
  Company,
} from '../types';

// ─────────────────────────────────────────────
// DATOS DE LA EMPRESA — Completar con datos reales
// ─────────────────────────────────────────────
export const mockCompany: Company = {
  id: 'comp-01',
  name: 'Mi Negocio',           // ← Nombre real del negocio
  taxId: '',                     // ← CUIT del negocio
  currencySymbol: '$',
  currencyCode: 'ARS',
  address: '',                   // ← Dirección
  phone: '',                     // ← Teléfono
  email: '',                     // ← Email de contacto
  variableProductCode: '0',
};

// ─────────────────────────────────────────────
// SUCURSALES — Agregar las reales
// ─────────────────────────────────────────────
export const mockBranches: Branch[] = [
  {
    id: 'br-01',
    companyId: 'comp-01',
    name: 'Sucursal Principal',   // ← Nombre de la sucursal
    code: 'SUC-01',
    address: '',
    phone: '',
    isMain: true,
  },
];

// ─────────────────────────────────────────────
// USUARIOS — Configurar accesos reales
// ─────────────────────────────────────────────
export const mockUsers: User[] = [
  {
    id: 'usr-01',
    username: 'admin',
    email: '',                    // ← Email del administrador
    fullName: 'Administrador',    // ← Nombre real del admin
    role: 'SUPER_ADMIN',
    branchId: 'br-01',
    is2FAEnabled: false,
    isActive: true,
  },
];

// ─────────────────────────────────────────────
// SESIÓN DE CAJA — Sin sesión activa al inicio
// ─────────────────────────────────────────────
export const mockCashSession: CashSession = {
  id: 'cs-001',
  cashRegisterId: 'cr-01',
  userId: 'usr-01',
  userName: 'Administrador',
  openedAt: new Date().toISOString(),
  initialKioskAmount: 0,
  initialCigaretteAmount: 0,
  isOpen: false,
  notes: '',
};

// ─────────────────────────────────────────────
// CATEGORÍAS — Vacías, agregar las del negocio
// ─────────────────────────────────────────────
export const mockCategories: Category[] = [];

// ─────────────────────────────────────────────
// PRODUCTOS — Vacíos, cargar inventario real
// ─────────────────────────────────────────────
export const mockProducts: Product[] = [];

// ─────────────────────────────────────────────
// CLIENTES — Solo Público General (consumidor final)
// ─────────────────────────────────────────────
export const mockCustomers: Customer[] = [
  {
    id: 'cust-01',
    taxId: '',
    name: 'Consumidor Final',
    creditLimit: 0,
    currentCredit: 0,
    createdAt: new Date().toISOString(),
    totalPurchases: 0,
  },
];

// ─────────────────────────────────────────────
// PROVEEDORES — Vacíos, agregar los reales
// ─────────────────────────────────────────────
export const mockSuppliers: Supplier[] = [];

// ─────────────────────────────────────────────
// VENTAS — Sin historial previo
// ─────────────────────────────────────────────
export const mockSales: Sale[] = [];

// ─────────────────────────────────────────────
// MOVIMIENTOS DE INVENTARIO (KARDEX) — Vacío
// ─────────────────────────────────────────────
export const mockKardexMovements: KardexMovement[] = [];

// ─────────────────────────────────────────────
// FACTURAS ELECTRÓNICAS — Vacías
// ─────────────────────────────────────────────
export const mockElectronicInvoices: ElectronicInvoice[] = [];

// ─────────────────────────────────────────────
// LOGS DE AUDITORÍA — Vacíos
// ─────────────────────────────────────────────
export const mockAuditLogs: AuditLog[] = [];
