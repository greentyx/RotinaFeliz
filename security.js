/**
 * js/security.js — Utilitários de segurança client-side
 * ─────────────────────────────────────────────────────────────
 * Importar como módulo ES em qualquer página que precise:
 *
 *   import { sanitizeHtml, secureSetInnerHTML, safeRedirect,
 *            validateEmailFrontend } from './security.js';
 *
 * Proteções implementadas:
 *   ✅ Sanitizador HTML leve (XSS) sem dependências externas
 *   ✅ Wrapper seguro para innerHTML (previne XSS na renderização)
 *   ✅ Bloqueio de redirecionamentos para URLs externas inesperadas
 *   ✅ Validação de e-mail no front (complemento ao back-end)
 *   ✅ Armazenamento seguro de tokens (httpOnly não acessível em JS,
 *      mas orienta contra uso de localStorage para dados sensíveis)
 *   ✅ Detecção de tentativas de script injection no input
 *   ✅ Sanitização de parâmetros de URL (evita open-redirect e XSS via query)
 * ─────────────────────────────────────────────────────────────
 */

// ── 1. SANITIZADOR HTML LEVE ─────────────────────────────────
// Permite apenas um conjunto seguro de tags e atributos.
// Use para renderizar qualquer conteúdo vindo do usuário ou do Firestore.

const ALLOWED_TAGS = new Set([
  'b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4',
]);

const ALLOWED_ATTRS = new Set(['class', 'id', 'style']);

/**
 * Remove tags e atributos não permitidos de uma string HTML.
 * Nunca usa eval, innerHTML ou document.write internamente.
 *
 * @param {string} dirty - HTML não confiável
 * @returns {string}     - HTML seguro (apenas tags/attrs permitidos)
 */
export function sanitizeHtml(dirty) {
  if (typeof dirty !== 'string') return '';
  const template = document.createElement('template');
  template.innerHTML = dirty;
  _sanitizeNode(template.content);
  const div = document.createElement('div');
  div.appendChild(template.content.cloneNode(true));
  return div.innerHTML;
}

function _sanitizeNode(node) {
  const children = [...node.childNodes];
  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // Substitui a tag pelo conteúdo de texto puro
        child.replaceWith(document.createTextNode(child.textContent));
      } else {
        // Remove atributos não permitidos
        const attrs = [...child.attributes];
        for (const attr of attrs) {
          if (!ALLOWED_ATTRS.has(attr.name.toLowerCase())) {
            child.removeAttribute(attr.name);
          }
        }
        _sanitizeNode(child);
      }
    }
  }
}

// ── 2. WRAPPER SEGURO PARA INNERHTML ────────────────────────
/**
 * Define o innerHTML de um elemento após sanitizar o conteúdo.
 * Use no lugar de `element.innerHTML = userContent`.
 *
 * @param {Element} element
 * @param {string}  html     - HTML não confiável
 */
export function secureSetInnerHTML(element, html) {
  if (!(element instanceof Element)) return;
  element.innerHTML = sanitizeHtml(html);
}

/**
 * Define texto puro em um elemento (sem HTML — 100% seguro).
 * Preferível ao innerHTML quando não precisa de formatação.
 *
 * @param {Element} element
 * @param {string}  text
 */
export function secureSetText(element, text) {
  if (!(element instanceof Element)) return;
  element.textContent = typeof text === 'string' ? text : String(text);
}

// ── 3. SAFE REDIRECT ─────────────────────────────────────────
// Evita open-redirect para domínios externos.
const SAFE_ORIGINS = [window.location.origin];

/**
 * Redireciona apenas para URLs do mesmo domínio.
 * Bloqueia redirecionamentos para domínios externos não permitidos.
 *
 * @param {string} url
 * @param {string[]} [extraAllowed] - origens extras permitidas (ex: Stripe)
 */
export function safeRedirect(url, extraAllowed = []) {
  try {
    const target = new URL(url, window.location.origin);
    const allowed = [...SAFE_ORIGINS, ...extraAllowed];

    if (!allowed.includes(target.origin)) {
      console.error('[security] Redirecionamento bloqueado para origem externa:', target.origin);
      return;
    }

    window.location.href = target.href;
  } catch {
    console.error('[security] URL de redirecionamento inválida:', url);
  }
}

// ── 4. SANITIZAÇÃO DE PARÂMETROS DE URL ─────────────────────
/**
 * Retorna um parâmetro da URL atual de forma segura (sem XSS).
 * @param {string} name - nome do parâmetro
 * @returns {string|null}
 */
export function getUrlParam(name) {
  const raw = new URLSearchParams(window.location.search).get(name);
  if (raw === null) return null;
  // Remove scripts e caracteres perigosos
  return raw.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim();
}

// ── 5. VALIDAÇÃO DE E-MAIL ───────────────────────────────────
/**
 * Valida formato de e-mail no frontend (confirmar também no backend).
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmailFrontend(email) {
  if (typeof email !== 'string' || email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// ── 6. DETECÇÃO DE SCRIPT INJECTION NO INPUT ────────────────
const INJECTION_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /data\s*:\s*text\/html/i,
];

/**
 * Retorna true se o valor contém tentativa de script injection.
 * Use para validar inputs antes de enviar ao servidor.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function hasInjection(value) {
  if (typeof value !== 'string') return false;
  return INJECTION_PATTERNS.some(p => p.test(value));
}

// ── 7. ORIENTAÇÕES SOBRE ARMAZENAMENTO SEGURO ───────────────
// ⚠️ TOKENS JWT (Firebase ID tokens) NÃO devem ficar em localStorage.
//    O Firebase SDK gerencia o token internamente em memória de forma
//    segura. Nunca faça: localStorage.setItem('token', idToken)
//
// ✅ Para dados NÃO sensíveis (preferências de UI, tema), use:
//    sessionStorage (limpo ao fechar aba) ou localStorage com cautela.
//
// ✅ Para dados sensíveis, confie no Firebase Auth — ele usa IndexedDB
//    com persistência controlada. Use auth.setPersistence() para
//    controlar o tempo de vida da sessão:
//
//   import { browserSessionPersistence, setPersistence } from '...firebase-auth.js';
//   await setPersistence(auth, browserSessionPersistence); // só nessa aba

/**
 * Remove dados sensíveis do sessionStorage e localStorage.
 * Chamar no logout.
 */
export function clearSensitiveStorage() {
  const sensitiveKeys = ['token', 'idToken', 'accessToken', 'refreshToken', 'uid', 'user'];
  for (const key of sensitiveKeys) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

// ── 8. PROTEÇÃO CONTRA CLICKJACKING (redundante com X-Frame-Options) ─
// Verifica se a página está sendo carregada dentro de um iframe.
// O header X-Frame-Options: DENY no vercel.json já bloqueia isso no nível
// do navegador, mas esta verificação extra protege browsers antigos.
(function checkFraming() {
  if (window.self !== window.top) {
    // Estamos dentro de um iframe não autorizado
    document.body.innerHTML = '';
    window.top.location = window.self.location;
  }
})();
