import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  return new Response(
    typeof body === 'string' ? body : JSON.stringify(body),
    {
      status,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    }
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse(null, 204);
  }

  if (req.method !== 'POST') {
    return corsResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'Missing authorization header' }, 401);
    }

    // Verify JWT and get user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return corsResponse({ error: 'Unauthorized' }, 401);
    }

    // Get user's subscription data
    const { data: subscription, error: subscriptionError } = await supabase
      .from('stripe_user_subscriptions')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subscriptionError) {
      console.error('Subscription fetch error:', subscriptionError);
      return corsResponse({ error: 'Failed to fetch subscription data' }, 500);
    }

    if (!subscription?.customer_id) {
      return corsResponse({ error: 'No subscription found' }, 404);
    }

    // Parse request body
    const { return_url } = await req.json();

    if (!return_url) {
      return corsResponse({ error: 'return_url is required' }, 400);
    }

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.customer_id,
      return_url: return_url,
    });

    return corsResponse({
      url: portalSession.url,
    });

  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return corsResponse({ 
      error: 'Failed to create customer portal session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});