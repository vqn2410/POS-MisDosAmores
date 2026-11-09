export type CuentaDniPaymentStatus =
  | 'AWAITING_CONFIRMATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'MANUALLY_CONFIRMED';

export interface CuentaDniPaymentPayload {
  amount: number;
  externalReference: string;
  saleId?: string;
  notes?: string;
}

export interface CuentaDniConfirmationData {
  referenceNumber: string;
  confirmedByUserId: string;
  confirmedByUserName: string;
  notes?: string;
}

export interface CuentaDniChargeInput {
  customerDni: string;
  claveDni: string;
}

export interface CuentaDniChargeResult {
  status: 'APPROVED' | 'REJECTED';
  operationId?: string;
  rejectionCode?: string;
  rejectionReason?: string;
}

export interface CuentaDniPayment {
  id: string;
  saleId?: string;
  amount: number;
  externalReference: string;
  status: CuentaDniPaymentStatus;
  surcharge?: number;
  customerDni?: string;
  operationId?: string;
  rejectionCode?: string;
  rejectionReason?: string;
  referenceNumber?: string;
  confirmedByUserId?: string;
  confirmedByUserName?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  notes?: string;
}
