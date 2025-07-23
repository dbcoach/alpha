import { useState, useEffect } from 'react';
import { stripeService, StripeSubscription } from '../services/stripeService';
import { useAuth } from '../contexts/AuthContext';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<StripeSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user]);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const userSubscription = await stripeService.getUserSubscription();
      setSubscription(userSubscription);
      setError(null);
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Failed to load subscription');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const isPlus = () => {
    return stripeService.isSubscriptionActive(subscription);
  };

  const isPro = () => {
    const product = stripeService.getSubscriptionProduct(subscription);
    return product?.name?.toLowerCase().includes('pro') || false;
  };

  const isFree = () => {
    return !isPlus();
  };

  return {
    subscription,
    loading,
    error,
    isPlus: isPlus(),
    isPro: isPro(),
    isFree: isFree(),
    refresh: loadSubscription
  };
}