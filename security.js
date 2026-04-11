// api/_lib/security.js
// ─────────────────────────────────────────────────────────────
// Utilitários de segurança compartilhados entre todas as
// Serverless Functions da Vercel.
//
// Proteções implementadas:
//   ✅ Rate Limiting por IP (evita brute-force e DDoS)
//   ✅ CORS restrito ao domínio próprio
//   ✅ Security Headers em todas as respostas de API
//   ✅ Detecção de IP real via headers Vercel/Cloudflare
// ─────────────────────────────────────────────────────────────

'use strict';

// ── 1. DOMÍNIOS PERMITIDOS ──────────────────────────────────
// Adicione aqui o domínio definitivo quando estiver no ar.
// Ex: 'https://rotinafeliz.com.br' ou 'https://app.rotinafeliz.vercel.app'
const ALLOWED_ORIGINS = [
  'https://rotina-feliz.vercel.app',
  // Adicione domínios extras ou de preview abaixo se necessário:
  // 'https://rotinafeliz-git-main-seuprojeto.vercel.app',
];

// ── 2. RATE LIMITER (in-memory por worker) ─────────────────
// Atenção: reseta a cada cold-start do worker da Vercel.
// Para rate limiting persistente em produção, use Upstash Redis.
const _rateLimitStore = new Map();

/**
 * Verifica se o IP atingiu o limite de requisições.
 *
 * @param {string} ip         - IP do cliente
 * @param {number} maxReqs    - Máx. requisições por janela (padrão: 30)
 * @param {number} windowMs   - Janela de tempo em ms (padrão: 60 segundos)
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
function rateLimit(ip, maxReqs = 30, windowMs = 60_000) {
  const now = Date.now();
  let entry = _rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count++;
  _rateLimitStore.set(ip, entry);

  // Limpeza periódica para evitar vazamento de memória
  if (_rateLimitStore.size > 5_000) {
    for (const [key, val] of _rateLimitStore) {
      if (now > val.resetAt) _rateLimitStore.delete(key);
    }
  }

  return {
    allowed:    entry.count <= maxReqs,
    remaining:  Math.max(0, maxReqs - entry.count),
    resetAt:    entry.resetAt,
  };
}

// ── 3. EXTRAÇÃO DE IP REAL ──────────────────────────────────
/**
 * Retorna o IP real do cliente considerando proxies/Vercel/Cloudflare.
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

// ── 4. CORS ─────────────────────────────────────────────────
/**
 * Define headers CORS e responde automaticamente ao preflight OPTIONS.
 *
 * @param {import('http').IncomingMessage}  req
 * @param {import('http').ServerResponse}   res
 * @returns {boolean} true se era preflight (handler deve retornar imediatamente)
 */
function handleCors(req, res) {
  const origin = req.headers.origin || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  // Só reflete a Origin se for permitida — nunca usa '*' com credenciais
  res.setHeader('Access-Control-Allow-Origin',      isAllowed ? origin : '');
  res.setHeader('Access-Control-Allow-Methods',     'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers',     'Content-Type, Authorization, stripe-signature');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
    return true; // preflight tratado — handler deve parar aqui
  }

  return false;
}

// ── 5. SECURITY HEADERS DE API ──────────────────────────────
/**
 * Aplica headers de segurança padrão em respostas de API.
 * (Os headers de páginas HTML ficam no vercel.json)
 *
 * @param {import('http').ServerResponse} res
 */
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('X-XSS-Protection',       '1; mode=block');
  res.setHeader('Referrer-Policy',        'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control',          'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma',                 'no-cache');
}

// ── 6. VALIDAÇÃO DE JWT (formato client-side) ───────────────
/**
 * Verifica se uma string tem formato JWT válido (3 partes base64url).
 * NÃO valida assinatura — apenas sanidade do formato antes de processar.
 *
 * @param {string} token
 * @returns {boolean}
 */
function isValidJwtFormat(token) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
  return parts.every(p => base64UrlPattern.test(p));
}

/**
 * Extrai o header Authorization Bearer e valida formato.
 * @param {import('http').IncomingMessage} req
 * @returns {{ token: string|null, error: string|null }}
 */
function extractBearerToken(req) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { token: null, error: 'Authorization header ausente ou inválido.' };
  }
  const token = authHeader.slice(7).trim();
  if (!isValidJwtFormat(token)) {
    return { token: null, error: 'Formato de token JWT inválido.' };
  }
  return { token, error: null };
}

module.exports = {
  rateLimit,
  getClientIp,
  handleCors,
  setSecurityHeaders,
  isValidJwtFormat,
  extractBearerToken,
  ALLOWED_ORIGINS,
};
