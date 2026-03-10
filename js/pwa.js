import { store } from './store.js';
import { showToast } from './ui.js';

let deferredPrompt = null;

export function initPWA() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    store.deferrePrompt = e;
    
    const banner = document.getElementById('pwa-banner');
    if (banner) {
      banner.classList.remove('pwa-banner-hidden');
    }
  });
  
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    store.deferrePrompt = null;
    
    const banner = document.getElementById('pwa-banner');
    if (banner) {
      banner.classList.add('pwa-banner-hidden');
    }
    
    showToast('TECNIYA instalada correctamente', 'success');
  });
}

export async function installPWA() {
  if (!deferredPrompt) {
    deferredPrompt = store.deferrePrompt;
  }
  
  if (!deferredPrompt) {
    showToast('No se puede instalar la aplicación', 'info');
    return;
  }
  
  deferredPrompt.prompt();
  
  const { choice } = await deferredPrompt.userChoice;
  
  if (choice === 'accepted') {
    deferredPrompt = null;
    store.deferrePrompt = null;
  }
  
  const banner = document.getElementById('pwa-banner');
  if (banner) {
    banner.classList.add('pwa-banner-hidden');
  }
}

export function generateManifest() {
  const manifest = {
    name: "TECNIYA",
    short_name: "TECNIYA",
    description: "Encontrá profesionales técnicos cerca tuyo",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: "assets/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "assets/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
  
  const manifestJson = JSON.stringify(manifest, null, 2);
  const blob = new Blob([manifestJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  let link = document.getElementById('manifest-link');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    link.id = 'manifest-link';
    document.head.appendChild(link);
  }
  
  link.href = url;
  
  return manifest;
}

export function initPWAEvents() {
  const installBtn = document.querySelector('#pwa-banner .btn-primary');
  if (installBtn) {
    installBtn.addEventListener('click', installPWA);
  }
  
  const closePwaBtn = document.querySelector('#pwa-banner .modal-close');
  if (closePwaBtn) {
    closePwaBtn.addEventListener('click', () => {
      const banner = document.getElementById('pwa-banner');
      if (banner) {
        banner.classList.add('pwa-banner-hidden');
      }
    });
  }
}
