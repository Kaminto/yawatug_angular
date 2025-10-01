// Payment Gateway Integration Service
export interface PaymentGatewayConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  supportedMethods: string[];
  supportedCurrencies: string[];
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  method: 'mobile_money' | 'bank_transfer' | 'card';
  reference: string;
  userId: string;
  phone?: string;
  email?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  status: 'pending' | 'completed' | 'failed';
  paymentUrl?: string;
  error?: string;
  gatewayResponse?: any;
}

export class PaymentGatewayService {
  private gateways: Map<string, PaymentGatewayConfig> = new Map();

  constructor() {
    this.initializeGateways();
  }

  private initializeGateways() {
    // PayTota Configuration
    this.gateways.set('paytota', {
      name: 'PayTota',
      apiKey: process.env.PAYTOTA_API_KEY || '',
      baseUrl: 'https://api.paytota.com/v1',
      enabled: true,
      supportedMethods: ['mobile_money', 'bank_transfer'],
      supportedCurrencies: ['UGX', 'USD']
    });

    // ClickPesa Configuration
    this.gateways.set('clickpesa', {
      name: 'ClickPesa',
      apiKey: process.env.CLICKPESA_API_KEY || '',
      baseUrl: 'https://api.clickpesa.com/v1',
      enabled: true,
      supportedMethods: ['mobile_money'],
      supportedCurrencies: ['UGX']
    });

    // Selcom Configuration
    this.gateways.set('selcom', {
      name: 'Selcom',
      apiKey: process.env.SELCOM_API_KEY || '',
      baseUrl: 'https://api.selcom.net/v1',
      enabled: true,
      supportedMethods: ['mobile_money', 'bank_transfer', 'card'],
      supportedCurrencies: ['UGX', 'USD', 'TZS']
    });
  }

  async processDeposit(request: PaymentRequest): Promise<PaymentResponse> {
    const gateway = this.selectOptimalGateway(request);
    
    if (!gateway) {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        error: 'No suitable payment gateway available'
      };
    }

    try {
      switch (gateway.name) {
        case 'PayTota':
          return await this.processPayTotaDeposit(request, gateway);
        case 'ClickPesa':
          return await this.processClickPesaDeposit(request, gateway);
        case 'Selcom':
          return await this.processSelcomDeposit(request, gateway);
        default:
          throw new Error('Unsupported gateway');
      }
    } catch (error: any) {
      console.error(`Payment gateway error (${gateway.name}):`, error);
      
      // Try fallback gateway
      const fallbackGateway = this.selectFallbackGateway(request, gateway.name);
      if (fallbackGateway) {
        console.log(`Attempting fallback to ${fallbackGateway.name}`);
        return await this.processDeposit(request);
      }

      return {
        success: false,
        transactionId: '',
        status: 'failed',
        error: error.message || 'Payment processing failed'
      };
    }
  }

  async processWithdrawal(request: PaymentRequest): Promise<PaymentResponse> {
    const gateway = this.selectOptimalGateway(request);
    
    if (!gateway) {
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        error: 'No suitable payment gateway available'
      };
    }

    try {
      switch (gateway.name) {
        case 'PayTota':
          return await this.processPayTotaWithdrawal(request, gateway);
        case 'ClickPesa':
          return await this.processClickPesaWithdrawal(request, gateway);
        case 'Selcom':
          return await this.processSelcomWithdrawal(request, gateway);
        default:
          throw new Error('Unsupported gateway');
      }
    } catch (error: any) {
      console.error(`Withdrawal processing error (${gateway.name}):`, error);
      return {
        success: false,
        transactionId: '',
        status: 'failed',
        error: error.message || 'Withdrawal processing failed'
      };
    }
  }

  async handleCallback(gatewayName: string, payload: any): Promise<void> {
    try {
      const gateway = this.gateways.get(gatewayName.toLowerCase());
      if (!gateway) {
        throw new Error(`Unknown gateway: ${gatewayName}`);
      }

      // Verify callback signature
      if (!this.verifyCallbackSignature(gateway, payload)) {
        throw new Error('Invalid callback signature');
      }

      // Process based on gateway type
      switch (gateway.name) {
        case 'PayTota':
          await this.handlePayTotaCallback(payload);
          break;
        case 'ClickPesa':
          await this.handleClickPesaCallback(payload);
          break;
        case 'Selcom':
          await this.handleSelcomCallback(payload);
          break;
      }
    } catch (error) {
      console.error('Callback processing error:', error);
      throw error;
    }
  }

  private selectOptimalGateway(request: PaymentRequest): PaymentGatewayConfig | null {
    const eligibleGateways = Array.from(this.gateways.values()).filter(gateway => 
      gateway.enabled &&
      gateway.supportedMethods.includes(request.method) &&
      gateway.supportedCurrencies.includes(request.currency)
    );

    if (eligibleGateways.length === 0) return null;

    // Selection logic based on amount, currency, and success rates
    if (request.currency === 'UGX' && request.method === 'mobile_money') {
      // Prefer ClickPesa for UGX mobile money
      return eligibleGateways.find(g => g.name === 'ClickPesa') || eligibleGateways[0];
    }

    if (request.amount > 1000000) { // Large amounts
      // Prefer PayTota for large amounts
      return eligibleGateways.find(g => g.name === 'PayTota') || eligibleGateways[0];
    }

    // Default to first available
    return eligibleGateways[0];
  }

  private selectFallbackGateway(request: PaymentRequest, excludeGateway: string): PaymentGatewayConfig | null {
    const eligibleGateways = Array.from(this.gateways.values()).filter(gateway => 
      gateway.enabled &&
      gateway.name !== excludeGateway &&
      gateway.supportedMethods.includes(request.method) &&
      gateway.supportedCurrencies.includes(request.currency)
    );

    return eligibleGateways[0] || null;
  }

  private async processPayTotaDeposit(request: PaymentRequest, gateway: PaymentGatewayConfig): Promise<PaymentResponse> {
    const payload = {
      amount: request.amount,
      currency: request.currency,
      reference: request.reference,
      phone: request.phone,
      email: request.email,
      callback_url: `${process.env.VITE_APP_URL}/api/payments/paytota/callback`,
      metadata: request.metadata
    };

    const response = await fetch(`${gateway.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gateway.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'PayTota API error');
    }

    return {
      success: true,
      transactionId: data.transaction_id,
      status: data.status,
      paymentUrl: data.payment_url,
      gatewayResponse: data
    };
  }

  private async processClickPesaDeposit(request: PaymentRequest, gateway: PaymentGatewayConfig): Promise<PaymentResponse> {
    const payload = {
      amount: request.amount,
      currency: request.currency,
      msisdn: request.phone,
      reference: request.reference,
      callback_url: `${process.env.VITE_APP_URL}/api/payments/clickpesa/callback`
    };

    const response = await fetch(`${gateway.baseUrl}/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gateway.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'ClickPesa API error');
    }

    return {
      success: true,
      transactionId: data.checkout_id,
      status: 'pending',
      gatewayResponse: data
    };
  }

  private async processSelcomDeposit(request: PaymentRequest, gateway: PaymentGatewayConfig): Promise<PaymentResponse> {
    const payload = {
      amount: request.amount,
      currency: request.currency,
      msisdn: request.phone,
      reference: request.reference,
      webhook_url: `${process.env.VITE_APP_URL}/api/payments/selcom/webhook`
    };

    const response = await fetch(`${gateway.baseUrl}/checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gateway.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Selcom API error');
    }

    return {
      success: true,
      transactionId: data.transid,
      status: 'pending',
      gatewayResponse: data
    };
  }

  private async processPayTotaWithdrawal(request: PaymentRequest, gateway: PaymentGatewayConfig): Promise<PaymentResponse> {
    // PayTota withdrawal implementation
    const payload = {
      amount: request.amount,
      currency: request.currency,
      recipient_phone: request.phone,
      reference: request.reference,
      callback_url: `${process.env.VITE_APP_URL}/api/payments/paytota/callback`
    };

    const response = await fetch(`${gateway.baseUrl}/withdrawals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gateway.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'PayTota withdrawal error');
    }

    return {
      success: true,
      transactionId: data.withdrawal_id,
      status: data.status,
      gatewayResponse: data
    };
  }

  private async processClickPesaWithdrawal(request: PaymentRequest, gateway: PaymentGatewayConfig): Promise<PaymentResponse> {
    // ClickPesa withdrawal implementation
    return {
      success: false,
      transactionId: '',
      status: 'failed',
      error: 'ClickPesa withdrawals not yet implemented'
    };
  }

  private async processSelcomWithdrawal(request: PaymentRequest, gateway: PaymentGatewayConfig): Promise<PaymentResponse> {
    // Selcom withdrawal implementation
    return {
      success: false,
      transactionId: '',
      status: 'failed',
      error: 'Selcom withdrawals not yet implemented'
    };
  }

  private verifyCallbackSignature(gateway: PaymentGatewayConfig, payload: any): boolean {
    // Implement signature verification for each gateway
    // This is crucial for security
    
    switch (gateway.name) {
      case 'PayTota':
        // PayTota signature verification logic
        return true; // Placeholder
      case 'ClickPesa':
        // ClickPesa signature verification logic
        return true; // Placeholder
      case 'Selcom':
        // Selcom signature verification logic
        return true; // Placeholder
      default:
        return false;
    }
  }

  private async handlePayTotaCallback(payload: any): Promise<void> {
    // Process PayTota callback
    const { transaction_id, status, reference } = payload;
    
    // Update transaction in database
    await this.updateTransactionStatus(reference, status, 'paytota', payload);
  }

  private async handleClickPesaCallback(payload: any): Promise<void> {
    // Process ClickPesa callback
    const { checkout_id, status, reference } = payload;
    
    // Update transaction in database
    await this.updateTransactionStatus(reference, status, 'clickpesa', payload);
  }

  private async handleSelcomCallback(payload: any): Promise<void> {
    // Process Selcom callback
    const { transid, status, reference } = payload;
    
    // Update transaction in database
    await this.updateTransactionStatus(reference, status, 'selcom', payload);
  }

  private async updateTransactionStatus(
    reference: string, 
    status: string, 
    gateway: string, 
    payload: any
  ): Promise<void> {
    try {
      // This would update the transaction in Supabase
      // Implementation depends on your database schema
      console.log(`Updating transaction ${reference} to status ${status} from ${gateway}`);
      
      // Update transaction record
      // Update wallet balance if completed
      // Send notifications
      // Log the callback
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const paymentGatewayService = new PaymentGatewayService();