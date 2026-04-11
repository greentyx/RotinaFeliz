// api/stripe-webhook.js
// ─────────────────────────────────────────────────────────────
// Único endpoint de backend do RotinaFeliz.
// Recebe eventos do Stripe e atualiza o Firestore.
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY      → sk_live_...
//   STRIPE_WEBHOOK_SECRET  → whsec_...
//   FIREBASE_PROJECT_ID    → rotinafelizac
//   FIREBASE_CLIENT_EMAIL  → service-account@...iam.gserviceaccount.com
//   FIREBASE_PRIVATE_KEY   → -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
// ─────────────────────────────────────────────────────────────

'use strict';

const stripe                          = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }    = require('firebase-admin/firestore');

const { rateLimit, getClientIp, setSecurityHeaders } = require('./_lib/security');
const { isValidFirebaseUid }                         = require('./_lib/sanitize');

// ── Firebase Admin — singleton ────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // A Vercel serializa \n como literal \\n — desfaz aqui
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

// ── Lê o body bruto (necessário para verificar assinatura Stripe) ─
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data',  chunk => chunks.push(chunk));
    req.on('end',   ()    => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── Handler principal ─────────────────────────────────────────
module.exports = async function handler(req, res) {
  // 1. Security headers em toda resposta
  setSecurityHeaders(res);

  // 2. Só aceita POST (Stripe envia POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // 3. Rate limiting por IP — 60 req/min por IP
  const ip = getClientIp(req);
  const rl = rateLimit(ip, 60, 60_000);
  res.setHeader('X-RateLimit-Remaining', String(rl.remaining));

  if (!rl.allowed) {
    console.warn('[stripe-webhook] Rate limit atingido: ip=' + ip);
    return res.status(429).json({ error: 'Muitas requisições. Tente novamente em instantes.' });
  }

  // 4. Verifica que stripe-signature está presente antes de ler o body
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    console.warn('[stripe-webhook] stripe-signature ausente');
    return res.status(400).json({ error: 'Assinatura do Stripe ausente.' });
  }

  // 5. Lê o body bruto e verifica a assinatura criptográfica do Stripe
  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error('[stripe-webhook] Erro ao ler body:', err.message);
    return res.status(500).json({ error: 'Erro interno ao processar requisição.' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    // Assinatura inválida = request forjado ou secret errado
    console.error('[stripe-webhook] Assinatura inválida:', err.message);
    return res.status(400).json({ error: 'Assinatura do webhook inválida.' });
  }

  // 6. Processa o evento
  try {
    switch (event.type) {

      // ── Pagamento confirmado → ativa Plano Família ──────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        const uid     = session.client_reference_id;

        // Valida o UID antes de qualquer operação no Firestore
        if (!uid || !isValidFirebaseUid(uid)) {
          console.warn('[stripe-webhook] client_reference_id ausente ou inválido');
          break;
        }

        await db.doc('users/' + uid).update({
          plan:             'familia',
          planUpdatedAt:    FieldValue.serverTimestamp(),
          stripeCustomerId: session.customer || null,
        });

        console.log('[stripe-webhook] Plano Família ativado: uid=' + uid);
        break;
      }

      // ── Assinatura cancelada → volta para plano gratuito ────
      case 'customer.subscription.deleted': {
        const customerId = event.data.object.customer;

        if (!customerId || typeof customerId !== 'string') {
          console.warn('[stripe-webhook] customer ID ausente');
          break;
        }

        const snap = await db
          .collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!snap.empty) {
          await snap.docs[0].ref.update({
            plan:          'free',
            planUpdatedAt: FieldValue.serverTimestamp(),
          });
          console.log('[stripe-webhook] Plano revertido para free: uid=' + snap.docs[0].id);
        } else {
          console.warn('[stripe-webhook] Usuário não encontrado para customerId=' + customerId);
        }
        break;
      }

      // ── Pagamento falhou → registra alerta ──────────────────
      case 'invoice.payment_failed': {
        const customerId = event.data.object.customer;
        console.warn('[stripe-webhook] Pagamento falhou para customerId=' + customerId);
        // Opcional: gravar campo paymentFailed:true no Firestore e avisar o usuário
        break;
      }

      default:
        // Evento desconhecido — ignora silenciosamente
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] Erro ao processar evento:', err.message);
    return res.status(500).json({ error: 'Erro interno ao processar evento.' });
  }

  // 7. Confirma recebimento para o Stripe (sem 200, ele retenta)
  return res.status(200).json({ received: true });
};
