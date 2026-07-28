import { OrderService } from './orders/OrderService';
import { PaymentService } from './payments/PaymentService';
import { QRService } from './qr/QRService';
import { WebhookService } from './webhooks/WebhookService';
import type {
  MPOrderPayload,
  MPOrderResult,
  MPOrderDetails,
  MPPaymentDetails,
  MPRefundResult,
  MPQRResult,
  MPWebhookPayload,
  MPSaleStatus,
} from './common/types';
import type { InvoicePayload } from '../arca/common/types';

export class MercadoPagoClient {
  private readonly orderService: OrderService;
  private readonly paymentService: PaymentService;
  private readonly qrService: QRService;
  private readonly webhookService: WebhookService;

  constructor() {
    this.orderService = new OrderService();
    this.paymentService = new PaymentService();
    this.qrService = new QRService();
    this.webhookService = new WebhookService();
  }

  public async createOrder(order: MPOrderPayload): Promise<MPOrderResult> {
    return this.orderService.createOrder(order);
  }

  public async getOrder(orderId: string): Promise<MPOrderDetails> {
    return this.orderService.getOrder(orderId);
  }

  public async cancelOrder(orderId: string): Promise<boolean> {
    return this.orderService.cancelOrder(orderId);
  }

  public async getPayment(paymentId: string): Promise<MPPaymentDetails> {
    return this.paymentService.getPayment(paymentId);
  }

  public async refundPayment(paymentId: string, amount?: number): Promise<MPRefundResult> {
    return this.paymentService.refundPayment(paymentId, amount);
  }

  public async createStaticQR(posId: string): Promise<string> {
    return this.qrService.createStaticQR(posId);
  }

  public async createDynamicQR(order: MPOrderPayload): Promise<MPQRResult> {
    return this.qrService.createDynamicQR(order);
  }

  public async receiveWebhook(
    payload: MPWebhookPayload,
    signature?: string,
    invoicePayloadContext?: InvoicePayload
  ): Promise<{ saleStatus: MPSaleStatus; fiscalResult?: any }> {
    return this.webhookService.receiveWebhook(payload, signature, invoicePayloadContext);
  }

  public validateWebhook(signature: string, payload: any): boolean {
    return this.webhookService.validateSignature(signature, payload);
  }
}
