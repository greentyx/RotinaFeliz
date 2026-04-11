/**
 * RotinaFeliz — Payment Module
 * ─────────────────────────────────────────────────────────────
 * Integração via Stripe Payment Link.
 *
 * SETUP:
 * 1. No Stripe Dashboard, vá em Payment Links → Create link
 * 2. Selecione seu produto "Plano Família" (R$ 19,90/mês)
 * 3. Em "After payment" coloque:
 *    https://seusite.vercel.app/pages/profile.html?checkout=success
 * 4. Substitua STRIPE_PAYMENT_LINK abaixo pelo link gerado (https://buy.stripe.com/...)
 *
 * Para o webhook (atualiza o Firestore após pagamento):
 * - Faça deploy do arquivo api/stripe-webhook.js na Vercel
 * - Cadastre a URL no Stripe Dashboard → Developers → Webhooks
 */

// ── SUBSTITUA AQUI pelo seu link do Stripe ───────────────────
export const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/00w9AV0nQh2G2GzffK4ZG02';

export const PLAN_PRICE_BRL = 'R$ 19,90';

/**
 * Redireciona para a página de pagamento do Stripe.
 * Passa o Firebase UID como parâmetro para o webhook identificar o usuário.
 *
 * @param {string} userId - Firebase Auth UID
 * @param {string} email  - E-mail do usuário (preenche automaticamente no checkout)
 */
export function startCheckout(userId, email) {
  const url = new URL(STRIPE_PAYMENT_LINK);
  url.searchParams.set('client_reference_id', userId);
  if (email) url.searchParams.set('prefilled_email', email);
  window.location.href = url.toString();
}
