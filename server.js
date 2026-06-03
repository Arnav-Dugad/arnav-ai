/**
 * Arnav AI — Stripe Payment Server
 * Run locally:  node server.js
 * Then open index.html with a local server (e.g. VSCode Live Server → localhost:5500)
 *
 * Install deps:  npm install
 */

const http   = require('http');
const stripe = require('stripe')(
  'sk_test_51TeJPqRM4RXOuINwUAyoObZwZ0zIzYnK8pzvPPDnqsjVGzo3fYktYFHHU28AdtmwWF396mfSilTCFwy9RhL1tzDj00rf0DSaUB'
);

const PORT = 3001;

const PLANS = {
  plus: { name: 'Arnav AI Plus', amount: 2000,  currency: 'usd', interval: 'month' },
  pro:  { name: 'Arnav AI Pro',  amount: 20000, currency: 'usd', interval: 'month' },
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res, statusCode, data) {
  cors(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

  const url = req.url.split('?')[0];

  // POST /create-checkout-session
  if (req.method === 'POST' && url === '/create-checkout-session') {
    const body = await readBody(req);
    const { plan, success_url, cancel_url, user_email, uid } = body;

    if (!PLANS[plan]) { json(res, 400, { detail: 'Invalid plan: ' + plan }); return; }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
          price_data: {
            currency: PLANS[plan].currency,
            product_data: { name: PLANS[plan].name },
            unit_amount: PLANS[plan].amount,
            recurring: { interval: PLANS[plan].interval },
          },
          quantity: 1,
        }],
        success_url: success_url + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url,
        customer_email: user_email || undefined,
        metadata: { uid: uid || '', plan },
      });
      json(res, 200, { url: session.url, session_id: session.id });
    } catch (err) {
      json(res, 400, { detail: err.message });
    }
    return;
  }

  // GET /verify-session/:id
  const verifyMatch = url.match(/^\/verify-session\/(.+)$/);
  if (req.method === 'GET' && verifyMatch) {
    const sessionId = verifyMatch[1];
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.status === 'complete' || session.payment_status === 'paid') {
        json(res, 200, {
          plan:            session.metadata?.plan || 'free',
          status:          'active',
          customer_id:     session.customer || '',
          subscription_id: session.subscription || '',
        });
      } else {
        json(res, 400, { detail: 'Payment not yet completed.' });
      }
    } catch (err) {
      json(res, 400, { detail: err.message });
    }
    return;
  }

  // Health check
  if (req.method === 'GET' && url === '/health') {
    json(res, 200, { status: 'ok', server: 'Arnav AI Stripe Server' }); return;
  }

  json(res, 404, { detail: 'Not found' });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ✦ Arnav AI Stripe Server');
  console.log('  Running at: http://localhost:' + PORT);
  console.log('  Test card:  4242 4242 4242 4242  (any future date, any CVC)');
  console.log('');
});
