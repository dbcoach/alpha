import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { stripeService } from '../../services/stripeService';
import { STRIPE_PRODUCTS } from '../../stripe-config';
import { 
  CreditCard, 
  Check, 
  Loader2, 
  ArrowLeft, 
  Shield,
  Zap,
  Database,
  Star
} from 'lucide-react';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth/signin');
    }
  }, [user, navigate]);

  const handleCheckout = async (priceId: string, mode: 'payment' | 'subscription') => {
    try {
      setLoading(true);
      setError(null);

      const { url } = await stripeService.createCheckoutSession(priceId, mode);
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error instanceof Error ? error.message : 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-slate-900/20 pointer-events-none" />
      
      <div className="relative z-10 container max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Upgrade to DB Coach Plus
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Unlock the full power of AI-driven database design and generation
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-center">
            {error}
          </div>
        )}

        {/* Product Cards */}
        <div className="grid gap-8 max-w-2xl mx-auto">
          {STRIPE_PRODUCTS.map((product) => (
            <div
              key={product.id}
              className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Popular Badge */}
              <div className="absolute top-4 right-4">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  Most Popular
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">{product.name}</h2>
                <p className="text-slate-300 leading-relaxed">{product.description}</p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white">
                    {formatPrice(product.price || 0, product.currency)}
                  </span>
                  {product.mode === 'subscription' && (
                    <span className="text-slate-400">/month</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4">What's included:</h3>
                <div className="space-y-3">
                  {[
                    'Advanced SQL generation with AI',
                    'Intelligent data generation',
                    'Interactive data visualization',
                    'Multi-database support',
                    'Export to multiple formats',
                    'Priority customer support'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-400" />
                      </div>
                      <span className="text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handleCheckout(product.priceId, product.mode)}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>
                      {product.mode === 'subscription' ? 'Start Subscription' : 'Buy Now'}
                    </span>
                  </>
                )}
              </button>

              {/* Security Note */}
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
                <Shield className="w-4 h-4" />
                <span>Secure payment powered by Stripe</span>
              </div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Advanced AI Generation</h3>
            <p className="text-slate-400">Generate complex database schemas with our advanced AI models</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Lightning Fast</h3>
            <p className="text-slate-400">Generate databases in seconds, not hours</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Enterprise Ready</h3>
            <p className="text-slate-400">Production-ready schemas with security best practices</p>
          </div>
        </div>
      </div>
    </div>
  );
}