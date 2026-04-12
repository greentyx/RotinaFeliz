// sw.js — RotinaFeliz Service Worker
// ─────────────────────────────────────────────────────────────
// Estratégia:
//   • Cache-first  → assets estáticos (CSS, JS, imagens, fontes)
//   • Network-first → páginas HTML (sempre tenta buscar versão nova)
//   • Bypass       → Firebase, Stripe, Cloudinary (nunca cachear dados do usuário)
//   • Offline page → exibida quando HTML não está em cache e rede está fora
// ─────────────────────────────────────────────────────────────

const CACHE_NAME    = 'rotinafeliz-v2';
const OFFLINE_URL   = '/offline.html';

// Assets estáticos que sempre ficam em cache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/pages/login.html',
  '/pages/app.html',
  '/pages/child.html',
  '/pages/profile.html',
  '/css/style.css',
  '/js/firebase.js',
  '/js/security.js',
  '/js/payment.js',
  '/js/cloudinary.js',
  '/assets/rf.png',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png',
  '/manifest.json',
  '/404.html',
  '/offline.html',
];

// Domínios que NUNCA devem ser cacheados (dados dinâmicos / autenticação)
const BYPASS_DOMAINS = [
  'firebaseio.com',
  'googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebasestorage.googleapis.com',
  'stripe.com',
  'stripecdn.com',
  'cloudinary.com',
  'px-cloud.net',
  'px-cdn.net',
];

function shouldBypass(url) {
  return BYPASS_DOMAINS.some(d => url.hostname.endsWith(d));
}

// ── INSTALL: pré-cacheia assets essenciais ────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()) // ativa imediatamente
  );
});

// ── ACTIVATE: limpa caches antigos ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // assume controle imediato
  );
});

// ── FETCH: estratégia por tipo de recurso ────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Só intercepta GET
  if (request.method !== 'GET') return;

  // 2. Nunca cacheia domínios externos sensíveis
  if (shouldBypass(url)) return;

  // 3. Recursos de fontes do Google → cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 4. Páginas HTML → network-first (sempre tenta atualizar)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  // 5. Assets estáticos (JS, CSS, imagens) → cache-first
  event.respondWith(cacheFirst(request));
});

// ── ESTRATÉGIAS ───────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sem rede e sem cache — retorna vazio
    return new Response('', { status: 408 });
  }
}

async function networkFirstHtml(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sem rede → tenta cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Não tem nem cache → mostra página offline
    const offline = await caches.match(OFFLINE_URL);
    return offline || new Response('<h1>Sem conexão</h1>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// ── MENSAGENS DO APP ──────────────────────────────────────────
// Permite que o app force atualização do SW chamando:
//   navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
