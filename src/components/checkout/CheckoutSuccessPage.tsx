import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home, Database } from 'lucide-react';
import { stripeService } from '../../services/stripeService';

export function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const userSubscription = await stripeService.getUserSubscription();
        setSubscription(userSubscription);
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, []);

  const getSubscriptionProduct = () => {
    if (!subscription?.price_id) return null;
    return stripeService.getProductByPriceId(subscription.price_id);
  };

  const product = getSubscriptionProduct();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-slate-900/20 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-white mb-4">
            Payment Successful!
          </h1>
          
          {loading ? (
            <div className="mb-8">
              <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-300">Setting up your subscription...</p>
            </div>
          ) : (
            <div className="mb-8">
              <p className="text-xl text-slate-300 mb-4">
                Welcome to DB Coach Plus!
              </p>
              {product && (
                <div className="bg-slate-900/50 rounded-lg p-6 mb-6">
                  <h2 className="text-lg font-semibold text-white mb-2">{product.name}</h2>
                  <p className="text-slate-400 mb-4">{product.description}</p>
                  
                  {subscription && (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-green-300 font-medium">
                        Status: {subscription.subscription_status}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-slate-400">
                You now have access to all premium features. Start creating amazing databases!
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200"
            >
              <Database className="w-5 h-5" />
              <span>Start Creating</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => navigate('/settings/billing')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white border border-slate-600/50 rounded-lg transition-all duration-200"
            >
              <span>Manage Subscription</span>
            </button>
          </div>

          {/* Session ID for reference */}
          {sessionId && (
            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <p className="text-xs text-slate-500">
                Session ID: {sessionId}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}