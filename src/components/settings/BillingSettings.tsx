import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Download,
  ExternalLink,
  Crown,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { stripeService, StripeSubscription, StripeOrder } from '../../services/stripeService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function BillingSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<StripeSubscription | null>(null);
  const [orders, setOrders] = useState<StripeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBillingData();
    }
  }, [user]);

  const loadBillingData = async () => {
    try {
      const [userSubscription, userOrders] = await Promise.all([
        stripeService.getUserSubscription(),
        stripeService.getUserOrders()
      ]);
      
      setSubscription(userSubscription);
      setOrders(userOrders);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'trialing':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'past_due':
      case 'unpaid':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return stripeService.formatPrice(amount, currency);
  };

  const isActive = stripeService.isSubscriptionActive(subscription);
  const product = stripeService.getSubscriptionProduct(subscription);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-slate-300">Loading billing information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Billing & Subscription</h2>
        <p className="text-slate-300">
          Manage your subscription and view billing history
        </p>
      </div>

      {/* Current Subscription */}
      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-400" />
            Current Plan
          </h3>
          
          {!isActive && (
            <button
              onClick={() => navigate('/checkout')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Upgrade Now
            </button>
          )}
        </div>

        {subscription && product ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
              <div>
                <h4 className="font-semibold text-white">{product.name}</h4>
                <p className="text-slate-400 text-sm">{product.description}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">
                  {formatAmount(product.price || 0, product.currency || 'usd')}
                  {product.mode === 'subscription' && <span className="text-sm text-slate-400">/month</span>}
                </div>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(subscription.subscription_status)}`}>
                  {getStatusIcon(subscription.subscription_status)}
                  {subscription.subscription_status}
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscription.current_period_start && (
                <div className="flex items-center gap-3 p-3 bg-slate-900/30 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-sm text-slate-400">Current Period</div>
                    <div className="text-white text-sm">
                      {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end!)}
                    </div>
                  </div>
                </div>
              )}

              {subscription.payment_method_last4 && (
                <div className="flex items-center gap-3 p-3 bg-slate-900/30 rounded-lg">
                  <CreditCard className="w-4 h-4 text-green-400" />
                  <div>
                    <div className="text-sm text-slate-400">Payment Method</div>
                    <div className="text-white text-sm">
                      {subscription.payment_method_brand} •••• {subscription.payment_method_last4}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {subscription.cancel_at_period_end && (
              <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-red-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Subscription will cancel at period end</span>
                </div>
                <p className="text-red-200 text-sm mt-1">
                  Your subscription will end on {formatDate(subscription.current_period_end!)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Free Plan</h4>
            <p className="text-slate-400 mb-6">
              You're currently on the free plan. Upgrade to unlock premium features.
            </p>
            <button
              onClick={() => navigate('/checkout')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Upgrade to DB Coach Plus
            </button>
          </div>
        )}
      </div>

      {/* Billing History */}
      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-400" />
          Billing History
        </h3>

        {orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.order_id}
                className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700/50"
              >
                <div>
                  <div className="font-medium text-white">
                    Payment #{order.order_id}
                  </div>
                  <div className="text-sm text-slate-400">
                    {new Date(order.order_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-white">
                    {formatAmount(order.amount_total, order.currency)}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    order.payment_status === 'paid' 
                      ? 'text-green-300 bg-green-500/20' 
                      : 'text-yellow-300 bg-yellow-500/20'
                  }`}>
                    {order.payment_status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No billing history available</p>
          </div>
        )}
      </div>

      {/* Manage Subscription */}
      {subscription && (
        <div className="p-6 rounded-xl bg-blue-900/20 border border-blue-500/30 backdrop-blur">
          <h3 className="text-lg font-semibold text-blue-300 mb-4">
            Manage Your Subscription
          </h3>
          <p className="text-blue-200 mb-4">
            Need to update your payment method, change your plan, or cancel your subscription? 
            You can manage all of this through the Stripe customer portal.
          </p>
          <button
            onClick={() => {
              // In a real implementation, you would create a customer portal session
              // For now, we'll show a message
              alert('Customer portal integration would be implemented here');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Customer Portal
          </button>
        </div>
      )}
    </div>
  );
}