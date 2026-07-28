export type MPPaymentStatus =
  | 'pending'
  | 'waiting'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export type MPSaleStatus =
  | 'PENDING_PAYMENT'
  | 'WAITING_CONFIRMATION'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'INTERNAL_RECEIPT_ISSUED'
  | 'INVOICED';

export interface MPOrderPayload {
  externalReference: string; // Sale ID or Ticket Number
  title: string;
  totalAmount: number;
  description?: string;
  items: Array<{
    title: string;
    quantity: number;
    unitPrice: number;
  }>;
  notificationUrl?: string;
}

export interface MPOrderResult {
  orderId: string;
  externalReference: string;
  status: MPPaymentStatus;
  qrData?: string;
  createdAt: string;
}

export interface MPOrderDetails {
  orderId: string;
  externalReference: string;
  status: MPPaymentStatus;
  totalAmount: number;
  paidAmount: number;
  paymentId?: string;
}

export interface MPPaymentDetails {
  paymentId: string;
  orderId?: string;
  status: MPPaymentStatus;
  statusDetail: string;
  amount: number;
  paymentMethodId: string; // e.g. 'pix', 'visa', 'account_money'
  payerEmail?: string;
  approvedAt?: string;
}

export interface MPRefundResult {
  refundId: string;
  paymentId: string;
  amount: number;
  status: 'approved' | 'rejected';
  createdAt: string;
}

export interface MPQRResult {
  qrCode: string; // Base64 or URL
  qrCodeData: string; // EMV Co QR String
  orderId: string;
}

export interface MPWebhookPayload {
  id: number;
  liveMode: boolean;
  type: 'payment' | 'mp-connect' | 'plan' | 'subscription' | 'invoice';
  dateCreated: string;
  applicationId: number;
  userId: string;
  action: 'payment.created' | 'payment.updated' | 'payment.approved' | 'payment.rejected' | 'payment.cancelled' | 'payment.refunded';
  data: {
    id: string; // Payment or Order ID
  };
}
