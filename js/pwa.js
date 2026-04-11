/**
 * js/pwa.js — Registro do Service Worker e prompt de instalação
 *
 * Inclua este script em todas as páginas:
 *   <script src="/js/pwa.js" defer></script>   (na raiz)
 *   <script src="../js/pwa.js" defer></script>  (em /pages/)
 */

// ── 1. REGISTRA O SERVICE WORKER ─────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[PWA] Service Worker registrado:', reg.scope);

        // Verifica se há atualização disponível
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          newSW?.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão disponível — mostra botão de atualizar
              showUpdateBanner();
            }
          });
        });
      })
      .catch(err => console.warn('[PWA] Falha ao registrar Service Worker:', err));
  });
}

// ── 2. BANNER DE ATUALIZAÇÃO DISPONÍVEL ──────────────────────
function showUpdateBanner() {
  // Evita criar múltiplos banners
  if (document.getElementById('pwa-update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-update-banner';
  banner.innerHTML = `
    <span>🔄 Nova versão disponível!</span>
    <button id="pwa-update-btn">Atualizar</button>
    <button id="pwa-update-close">✕</button>
  `;
  Object.assign(banner.style, {
    position: 'fixed', bottom: '80px', left: '50%',
    transform: 'translateX(-50%)',
    background: '#4A90D9', color: '#fff',
    padding: '12px 20px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', gap: '12px',
    fontSize: '14px', fontFamily: 'Nunito, sans-serif',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    zIndex: '9999', whiteSpace: 'nowrap',
  });

  document.body.appendChild(banner);

  document.getElementById('pwa-update-btn').onclick = () => {
    navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  document.getElementById('pwa-update-close').onclick = () => banner.remove();
}

// ── 3. PROMPT DE INSTALAÇÃO (Add to Home Screen) ─────────────
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  hideInstallButton();
  console.log('[PWA] App instalado com sucesso!');
});

function showInstallButton() {
  // Não mostra se já está instalado (display: standalone)
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (document.getElementById('pwa-install-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'pwa-install-btn';
  btn.innerHTML = '📲 Instalar App';
  Object.assign(btn.style, {
    position: 'fixed', bottom: '20px', right: '20px',
    background: '#5BB974', color: '#fff',
    border: 'none', borderRadius: '50px',
    padding: '12px 22px', fontSize: '14px', fontWeight: '700',
    fontFamily: 'Nunito, sans-serif',
    cursor: 'pointer', boxShadow: '0 4px 16px rgba(91,185,116,0.4)',
    zIndex: '9999', display: 'flex', alignItems: 'center', gap: '8px',
    transition: 'transform .2s',
  });

  btn.onmouseenter = () => btn.style.transform = 'scale(1.05)';
  btn.onmouseleave = () => btn.style.transform = 'scale(1)';

  btn.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Escolha do usuário:', outcome);
    deferredPrompt = null;
    btn.remove();
  };

  document.body.appendChild(btn);
}

function hideInstallButton() {
  document.getElementById('pwa-install-btn')?.remove();
}
