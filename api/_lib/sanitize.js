// api/_lib/sanitize.js
// ─────────────────────────────────────────────────────────────
// Sanitização de entrada no servidor.
//
// Proteções implementadas:
//   ✅ Escaping de HTML (XSS)
//   ✅ Detecção de padrões SQL Injection
//   ✅ Detecção de script injection em strings
//   ✅ Sanitização recursiva de objetos JSON
//   ✅ Validação de e-mail e UID Firebase
// ─────────────────────────────────────────────────────────────

'use strict';

// ── 1. ESCAPE HTML ──────────────────────────────────────────
// Converte caracteres perigosos em entidades HTML.
// Use antes de gravar qualquer string do usuário no Firestore
// ou de refletir input numa resposta.
const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escapa caracteres HTML em uma string.
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[&<>"'`=/]/g, ch => HTML_ESCAPES[ch]);
}

// ── 2. DETECÇÃO DE SQL INJECTION ────────────────────────────
const SQL_PATTERNS = [
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|HAVING|GRANT|REVOKE)\b/i,
  /(--|;|\/\*|\*\/|xp_|sp_)/,
  /\b(OR|AND)\b\s+[\w'"]+=[\w'"]+/i,        // OR 1=1 / AND 'x'='x'
  /'\s*(OR|AND)\s*'/i,
  /\bWAITFOR\s+DELAY\b/i,                    // time-based blind injection
  /\bSLEEP\s*\(/i,
];

/**
 * Retorna true se a string contém padrões de SQL injection.
 * @param {string} value
 * @returns {boolean}
 */
function hasSqlInjection(value) {
  if (typeof value !== 'string') return false;
  return SQL_PATTERNS.some(p => p.test(value));
}

// ── 3. DETECÇÃO DE SCRIPT INJECTION ─────────────────────────
const SCRIPT_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,                              // onerror=, onclick=, etc.
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
];

/**
 * Retorna true se a string contém tentativa de script injection.
 * @param {string} value
 * @returns {boolean}
 */
function hasScriptInjection(value) {
  if (typeof value !== 'string') return false;
  return SCRIPT_PATTERNS.some(p => p.test(value));
}

// ── 4. SANITIZAÇÃO DE OBJETO JSON ───────────────────────────
/**
 * Sanitiza recursivamente (até 2 níveis) as strings de um objeto.
 * Preserva números e booleanos; descarta qualquer coisa não-primitiva
 * que não esteja numa lista de tipos esperados.
 *
 * @param {Record<string, unknown>} obj
 * @param {number} depth - nível atual (não passar externamente)
 * @returns {Record<string, unknown>}
 */
function sanitizeBody(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  if (depth > 2) return {}; // evita recursão profunda

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    // Sanitiza a própria chave para evitar prototype pollution
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeKey || safeKey === '__proto__' || safeKey === 'constructor') continue;

    if (typeof val === 'string') {
      clean[safeKey] = escapeHtml(val.slice(0, 4096)); // limita tamanho
    } else if (typeof val === 'number' && isFinite(val)) {
      clean[safeKey] = val;
    } else if (typeof val === 'boolean') {
      clean[safeKey] = val;
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      clean[safeKey] = sanitizeBody(val, depth + 1);
    }
    // null, array com tipos mistos, funções → descartados
  }
  return clean;
}

// ── 5. VALIDAÇÕES ───────────────────────────────────────────

/**
 * Valida formato de e-mail básico.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (typeof email !== 'string' || email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida que um Firebase UID tem o formato esperado
 * (string alfanumérica de 28 chars).
 * @param {string} uid
 * @returns {boolean}
 */
function isValidFirebaseUid(uid) {
  if (typeof uid !== 'string') return false;
  return /^[a-zA-Z0-9]{20,128}$/.test(uid);
}

/**
 * Garante que um valor é string e está dentro do tamanho máximo.
 * @param {unknown} val
 * @param {number}  maxLen
 * @returns {string}
 */
function safeString(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  return val.slice(0, maxLen).trim();
}

module.exports = {
  escapeHtml,
  hasSqlInjection,
  hasScriptInjection,
  sanitizeBody,
  isValidEmail,
  isValidFirebaseUid,
  safeString,
};
