const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const logger = require('../utils/logger');

class StripeService {
  async createPaymentIntent(amount, currency = 'usd') {
    try {
      return await stripe.paymentIntents.create({ amount, currency });
    } catch (err) {
      logger.error('Stripe payment intent error:', err.message);
      throw err;
    }
  }

  async createCustomer(email, name) {
    try {
      return await stripe.customers.create({ email, name });
    } catch (err) {
      logger.error('Stripe create customer error:', err.message);
      throw err;
    }
  }
}

module.exports = new StripeService();
