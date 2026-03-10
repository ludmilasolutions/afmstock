import { store } from './store.js';
import { getSupabase } from './supabase.js';
import { showToast, closeModal } from './ui.js';
import { ADS_DEFAULT } from './config.js';

export let allAds = [];

export async function loadAds() {
  const sb = getSupabase();
  try {
    const { data, error } = await sb.from('ads').select('*').eq('active', true);
    if (error) {
      console.warn('loadAds error:', error.message);
      allAds = ADS_DEFAULT;
    } else {
      allAds = (data && data.length > 0) ? data : ADS_DEFAULT;
      console.log('Ads cargados:', allAds.length, allAds.map(a => a.title));
    }
  } catch(e) {
    console.warn('loadAds exception:', e.message);
    allAds = ADS_DEFAULT;
  }
  store.setAllAds(allAds);
  showAd('nacional');
  setTimeout(() => showAd('nacional'), 500);
}

export function showAd(level) {
  const ads = store.allAds?.length ? store.allAds : allAds;
  if (!ads || ads.length === 0) return;

  let filtered = ads.filter(a => a.level === level);
  if (!filtered.length) filtered = ads.filter(a => a.level === 'nacional' || !a.level);
  if (!filtered.length) filtered = ads;

  const ad = filtered[Math.floor(Math.random() * filtered.length)];
  if (!ad) return;

  renderAdBanner(ad);
}

function renderAdBanner(ad) {
  // Ocultar el banner estático del HTML
  const staticBanner = document.getElementById('ad-banner-main');
  if (staticBanner) {
    staticBanner.style.display = 'none';
  }
  
  let banner = document.getElementById('custom-ad-banner');
  
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'custom-ad-banner';
    banner.style.cssText = `
      position: relative;
      width: 100%;
      margin: 0 -20px;
      padding: 16px 20px;
      background: linear-gradient(135deg, rgba(79, 70, 229, 0.25), rgba(6, 182, 212, 0.25));
      border-top: 1px solid rgba(79, 70, 229, 0.3);
      border-bottom: 1px solid rgba(79, 70, 229, 0.3);
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-sizing: border-box;
    `;
    
    // Estilos responsive en JavaScript
    const style = document.createElement('style');
    style.id = 'ad-banner-responsive-style';
    style.textContent = `
      @media (max-width: 768px) {
        #custom-ad-banner {
          flex-direction: column !important;
          text-align: center !important;
          gap: 12px !important;
          padding: 16px 16px !important;
        }
        #custom-ad-banner .ad-banner-img {
          width: 100% !important;
          height: 120px !important;
          max-width: 100% !important;
        }
        #custom-ad-banner .ad-banner-text {
          width: 100% !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    banner.onclick = () => {
      if (ad.link && ad.link !== '#') {
        window.open(ad.link, '_blank');
      }
    };
    
    // Insertar antes del search-section
    const searchSection = document.getElementById('search-section');
    if (searchSection && searchSection.parentElement) {
      searchSection.parentElement.insertBefore(banner, searchSection);
    } else {
      const container = document.querySelector('.container');
      if (container) {
        container.insertBefore(banner, container.firstChild);
      }
    }
  }

  // Aplicar transformación de imagen guardada
  let imgTransform = { zoom: 1, posX: 0, posY: 0 };
  try {
    if (ad.image_transform) {
      if (typeof ad.image_transform === 'string') {
        imgTransform = JSON.parse(ad.image_transform);
      } else {
        imgTransform = { 
          zoom: ad.image_transform.zoom || 1, 
          posX: ad.image_transform.posX || 0, 
          posY: ad.image_transform.posY || 0 
        };
      }
    } else if (ad.image_zoom) {
      imgTransform = { zoom: ad.image_zoom || 1, posX: ad.image_posX || 0, posY: ad.image_posY || 0 };
    }
  } catch(e) {
    console.warn('Error parsing image_transform:', e);
  }
  
  const imgStyle = `width:140px;height:80px;border-radius:8px;object-fit:cover;flex-shrink:0;box-shadow:0 2px 10px rgba(0,0,0,0.3);transform:scale(${imgTransform.zoom}) translate(${imgTransform.posX}px, ${imgTransform.posY}px);`;
  
  const imageHtml = ad.image_url 
    ? `<img src="${ad.image_url}" class="ad-banner-img" style="${imgStyle}" alt="${ad.title}">`
    : `<div class="ad-banner-img" style="width:140px;height:80px;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#06b6d4);display:flex;align-items:center;justify-content:center;color:white;font-size:24px;box-shadow:0 2px 10px rgba(0,0,0,0.3);flex-shrink:0;"><i class="fa fa-bullhorn"></i></div>`;
  
  banner.innerHTML = `
    ${imageHtml}
    <div class="ad-banner-text" style="flex: 1; min-width: 0;">
      <div style="font-weight: 700; font-size: 1rem; color: #fff; margin-bottom: 4px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${ad.title || 'Publicidad'}</div>
      <div style="font-size: 0.85rem; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ad.description || ''}</div>
    </div>
    <div style="flex-shrink: 0; padding: 8px 16px; background: rgba(255,255,255,0.15); border-radius: 8px; color: #fff; font-size: 0.8rem; font-weight: 600; white-space: nowrap;">
      <i class="fa fa-external-link" style="margin-right:6px;"></i> Ver más
    </div>
  `;
  
  banner.onmouseenter = () => {
    banner.style.background = 'linear-gradient(135deg, rgba(79, 70, 229, 0.35), rgba(6, 182, 212, 0.35))';
    banner.style.transform = 'scale(1.01)';
  };
  banner.onmouseleave = () => {
    banner.style.background = 'linear-gradient(135deg, rgba(79, 70, 229, 0.25), rgba(6, 182, 212, 0.25))';
    banner.style.transform = 'scale(1)';
  };
}

export async function onProvinceChange() {
  const prov = document.getElementById('filter-province')?.value;
  showAd(prov ? 'provincial' : 'nacional');
  
  const { applyFilters } = await import('./professionals.js');
  applyFilters();
}

export function onCityInput() {
  const city = document.getElementById('filter-city')?.value;
  const province = document.getElementById('filter-province')?.value;
  showAd(city ? 'local' : (province ? 'provincial' : 'nacional'));
}

export function openAdLink() {
  const bannerEl = document.getElementById('custom-ad-banner');
  if (!bannerEl) return;
  
  const ads = store.allAds?.length ? store.allAds : allAds;
  if (ads && ads.length > 0) {
    const ad = ads[0];
    if (ad.link && ad.link !== '#') {
      window.open(ad.link, '_blank');
    }
  }
}

export async function saveAd() {
  const sb = getSupabase();
  const title = document.getElementById('ad-form-title')?.value.trim();
  const desc = document.getElementById('ad-form-desc')?.value.trim();
  const level = document.getElementById('ad-form-level')?.value;
  const link = document.getElementById('ad-form-link')?.value.trim();
  const province = document.getElementById('ad-form-province')?.value.trim();
  const city = document.getElementById('ad-form-city')?.value.trim();
  
  if (!title) {
    showToast('El título es obligatorio', 'error');
    return;
  }
  
  const { error } = await sb.from('ads').insert({
    title,
    description: desc,
    level,
    link,
    province,
    city,
    active: true,
    created_at: new Date().toISOString()
  });
  
  closeModal('modal-new-ad');
  
  if (error) {
    showToast('Error al crear publicidad', 'error');
  } else {
    showToast('Publicidad creada', 'success');
    loadAds();
    
    const { loadAdminData } = await import('./admin.js');
    loadAdminData();
  }
}
