export type RoleType = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'INVENTORY_CLERK';

export type SaleType = 'UNIT' | 'WEIGHT' | 'VARIABLE';
export type CashBoxType = 'KIOSK' | 'CIGARRILLOS';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: RoleType;
  avatarUrl?: string;
  branchId: string;
  is2FAEnabled: boolean;
  isActive: boolean;
}

export interface Company {
  id: string;
  name: string;
  ownerName?: string;
  taxId: string; // RFC/RUT/NIT
  logoUrl?: string;
  currencySymbol: string;
  currencyCode: string;
  address: string;
  phone: string;
  email: string;
  variableProductCode?: string; // Default: '0'
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  isMain: boolean;
}

export interface CashRegister {
  id: string;
  branchId: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface CashSession {
  id: string;
  cashRegisterId: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt?: string;
  initialKioskAmount: number;
  initialCigaretteAmount: number;
  finalAmount?: number;
  calculatedTotal?: number;
  difference?: number;
  isOpen: boolean;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  brandId?: string;
  brandName?: string;
  supplierId?: string;
  supplierName?: string;
  costPrice: number;
  salePrice: number; // For WEIGHT products: Price per Kg ($/Kg)
  taxRate: number; // e.g. 16.00
  stock: number;
  minStock: number;
  tracksStock?: boolean; // false = no afecta inventario (ej: servicios)
  unit: string; // 'pza', 'kg', 'bolsa', etc.
  saleType?: SaleType;      // 'UNIT' | 'WEIGHT' | 'VARIABLE'
  cashBoxType?: CashBoxType; // 'KIOSK' | 'CIGARRILLOS'
  isActive: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number; // percent or fixed amount
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  saleType?: SaleType;
  weightKg?: number; // Weight in Kg if saleType === 'WEIGHT'
  isVariableProduct?: boolean; // True if 'Producto Vario' (does not deduct inventory)
  notes?: string;
}

export type PaymentMethodType = 'CASH' | 'CARD' | 'TRANSFER' | 'QR' | 'CREDIT' | 'MIXED';

export interface SalePayment {
  id: string;
  method: PaymentMethodType;
  amount: number;
  reference?: string;
  change?: number;
  surchargeAmount?: number;
}

export type SaleStatus = 'COMPLETED' | 'HOLD' | 'CANCELLED' | 'REFUNDED';

export interface FiscalInvoice {
  cae: string;
  caeExpiration: string;
  voucherType: number;
  voucherNumber: number;
  salesPoint: number;
  emittedAt: string;
  status: 'A' | 'R';
  docType?: number;
  docNumber?: string;
  observations?: string[];
}

export interface CreditNote {
  id: string;
  voucherNumber: number;
  voucherType: number;
  salesPoint: number;
  cae: string;
  caeExpiration?: string;
  amount: number;
  associatedVoucher: { voucherType: number; salesPoint: number; voucherNumber: number };
  source: 'SUBSANACION' | 'ANULACION';
  saleId?: string;
  ticketNumber?: string;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  cashSessionId: string;
  type: 'INCOME' | 'WITHDRAWAL';
  amount: number;
  reason: string;
  userId: string;
  userName: string;
  createdAt: string;
  status?: 'ACTIVE' | 'CANCELLED';
  cancelledAt?: string;
  cancelledByUserId?: string;
  cancelledByUserName?: string;
}

export interface Sale {
  id: string;
  ticketNumber: string;
  branchId: string;
  branchName: string;
  cashSessionId: string;
  userId: string;
  userName: string;
  customerId?: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  status: SaleStatus;
  payments: SalePayment[];
  notes?: string;
  fiscalInvoice?: FiscalInvoice;
  fiscalCreditNote?: FiscalInvoice;
  createdAt: string;
}

export interface Customer {
  id: string;
  taxId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit: number;
  currentCredit: number;
  createdAt: string;
  totalPurchases: number;
}

export interface Supplier {
  id: string;
  taxId: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  productCount: number;
}

export type InventoryMovementType =
  | 'IN_PURCHASE'
  | 'IN_ADJUSTMENT'
  | 'IN_TRANSFER'
  | 'IN_RETURN'
  | 'OUT_SALE'
  | 'OUT_ADJUSTMENT'
  | 'OUT_TRANSFER'
  | 'OUT_DAMAGE';

export interface KardexMovement {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  branchId: string;
  branchName: string;
  type: InventoryMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number;
  reference: string;
  notes?: string;
  createdAt: string;
  userName: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  costPrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNo: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
}

export interface ElectronicInvoice {
  id: string;
  saleId: string;
  ticketNumber: string;
  uuid: string; // Folio Fiscal SAT/PAC
  invoiceNo: string;
  taxId: string;
  receiverName: string;
  total: number;
  status: 'ISSUED' | 'CANCELLED' | 'PENDING' | 'ERROR';
  pdfUrl?: string;
  xmlUrl?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface WorkspaceTab {
  id: string;
  title: string;
  iconName: string;
  route: string;
  closable: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}
