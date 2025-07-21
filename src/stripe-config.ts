export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
  price?: number;
  currency?: string;
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_Sidtu4WLw091Iw',
    priceId: 'price_1RnCboPoBgB2htQCTsWxZdKJ',
    name: 'DB Coach Plus',
    description: 'Full access to DB Coach for SQL generation, data generation, and data visualization.',
    mode: 'subscription',
    price: 1900, // $19.00 in cents
    currency: 'usd'
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return STRIPE_PRODUCTS.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): StripeProduct | undefined => {
  return STRIPE_PRODUCTS.find(product => product.id === id);
};