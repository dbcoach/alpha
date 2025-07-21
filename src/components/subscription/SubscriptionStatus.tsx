import React, { useState, useEffect } from 'react';
import { Crown, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { stripeService, StripeSubscription } from '../../services/stripeService';
import { useAuth } from '../../contexts/AuthContext';

interface SubscriptionStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function SubscriptionStatus({ className = '', showDetails = false }: SubscriptionStatusProps) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<StripeSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = async () => {
    try {
      const userSubscription = await stripeService.getUserSubscription();
      setSubscription(userSubscription);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!subscription) return <Clock className="w-4 h-4 text-slate-400" />;
    
    switch (subscription.subscription_status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'trialing':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'past_due':
      case 'unpaid':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusText = () => {
    if (!subscription) return 'Free Plan';
    
    const product = stripeService.getSubscriptionProduct(subscription);
    const isActive = stripeService.isSubscriptionActive(subscription);
    
    if (isActive && product) {
      return product.name;
    }
    
    switch (subscription.subscription_status) {
      case 'trialing':
        return 'Trial Period';
      case 'past_due':
        return 'Payment Due';
      case 'canceled':
        return 'Cancelled';
      default:
        return 'Free Plan';
    }
  };

  const getStatusColor = () => {
    if (!subscription) return 'text-slate-400';
    
    switch (subscription.subscription_status) {
      case 'active':
        return 'text-green-400';
      case 'trialing':
        return 'text-blue-400';
      case 'past_due':
      case 'unpaid':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Loading...</span>
      </div>
    );
  }

  const isActive = stripeService.isSubscriptionActive(subscription);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isActive && <Crown className="w-4 h-4 text-purple-400" />}
      {getStatusIcon()}
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      
      {showDetails && subscription && (
        <div className="ml-2 text-xs text-slate-500">
          {subscription.current_period_end && (
            <span>
              Until {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}