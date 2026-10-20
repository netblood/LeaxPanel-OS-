const paypal = require('paypal-rest-sdk');
const logger = require('../utils/logger');

paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID || '',
  client_secret: process.env.PAYPAL_CLIENT_SECRET || ''
});

class PayPalService {
  async createPayment(amount, currency = 'USD', returnUrl, cancelUrl) {
    return new Promise((resolve, reject) => {
      const payment = {
        intent: 'sale',
        payer: { payment_method: 'paypal' },
        transactions: [{
          amount: { total: amount, currency },
          description: 'LEAXOS Payment'
        }],
        redirect_urls: { return_url: returnUrl, cancel_url: cancelUrl }
      };
      paypal.payment.create(payment, (err, payment) => {
        if (err) {
          logger.error('PayPal create payment error:', err);
          reject(err);
        } else {
          resolve(payment);
        }
      });
    });
  }
}

module.exports = new PayPalService();
