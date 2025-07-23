import { supabase } from '../lib/supabase';
import { STRIPE_PRODUCTS, StripeProduct } from '../stripe-config';

export interface StripeSubscription {
  customer_id: string;
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export interface StripeOrder {
  order_id: number;
  checkout_session_id: string;
  payment_intent_id: string;
  amount_subtotal: number;
  amount_total: number;
  currency: string;
  payment_status: string;
  order_status: string;
  order_date: string;
}

class StripeService {
  async createCheckoutSession(priceId: string, mode: 'payment' | 'subscription' = 'subscription'): Promise<{ sessionId: string; url: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        price_id: priceId,
        mode,
        success_url: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/checkout/cancel`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    return await response.json();
  }

  async getUserSubscription(): Promise<StripeSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
  }

  async getUserOrders(): Promise<StripeOrder[]> {
    try {
      const { data, error } = await supabase
        .from('stripe_user_orders')
        .select('*')
        .order('order_date', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  getProducts(): StripeProduct[] {
    return STRIPE_PRODUCTS;
  }

  getProductByPriceId(priceId: string): StripeProduct | undefined {
    return STRIPE_PRODUCTS.find(product => product.priceId === priceId);
  }

  formatPrice(amount: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  isSubscriptionActive(subscription: StripeSubscription | null): boolean {
    if (!subscription) return false;
    return ['active', 'trialing'].includes(subscription.subscription_status);
  }

  getSubscriptionProduct(subscription: StripeSubscription | null): StripeProduct | null {
    if (!subscription?.price_id) return null;
    return this.getProductByPriceId(subscription.price_id) || null;
  }

  async createCustomerPortalSession(): Promise<{ url: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-customer-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        return_url: `${window.location.origin}/settings/billing`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create customer portal session: ${error}`);
    }

    return await response.json();
  }
}

export const stripeService = new StripeService();
export default stripeService;