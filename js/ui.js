import { store } from './store.js';

export function showPage(pageId) {
  const prev = document.querySelector('.page.active');
  if (prev) {
    const prevId = prev.id.replace('page-', '');
    store.setPreviousPage(prevId);
    if (prevId === 'chat') {
      import('./chat.js').then(m => m.cleanupChat?.());
    }
  }

  // Cerrar dropdown y selección múltiple al navegar
  document.getElementById('user-dropdown')?.classList.remove('open');
  document.getElementById('mobile-nav')?.classList.remove('open');
  const multiBar = document.getElementById('multi-request-bar');
  if (multiBar) multiBar.style.display = 'none';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) {
    page.classList.add('active');
    window.scrollTo(0, 0);
  }

  return pageId;
}

export function getCurrentPage() {
  const active = document.querySelector('.page.active');
  return active ? active.id.replace('page-', '') : 'home';
}

export function goBack() {
  showPage(store.previousPage || 'home');
}

export function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

export function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(modal => {
    modal.classList.remove('open');
  });
}

export function toggleMobileMenu() {
  const mobileNav = document.getElementById('mobile-nav');
  if (mobileNav) {
    mobileNav.classList.toggle('open');
  }
}

export function closeMobileMenu() {
  const mobileNav = document.getElementById('mobile-nav');
  if (mobileNav) {
    mobileNav.classList.remove('open');
  }
}

export function toggleUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) dropdown.classList.toggle('open');
}

export function hideUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) dropdown.classList.remove('open');
}

export function showToast(msg, type = 'info') {
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation'
  };
  const colors = {
    success: 'var(--green)',
    error: '#f87171',
    info: 'var(--accent)',
    warning: 'var(--orange)'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa ${icons[type] || 'fa-circle-info'} toast-icon" style="color:${colors[type]};"></i><span>${msg}</span>`;
  
  const container = document.getElementById('toast-container');
  if (container) {
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}

export function scrollToSearch() {
  const searchSection = document.getElementById('search-section');
  if (searchSection) {
    searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function switchTab(event, tabId) {
  const clickedTab = event.target.closest('.tab') || event.target;
  const container = clickedTab.closest('[id$="-tabs"]')?.parentElement || document;
  container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  clickedTab.classList.add('active');
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
}

export function initUIEvents() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });

  document.addEventListener('click', e => {
    const userDropdown = document.getElementById('user-dropdown');
    const userAvatarBtn = document.getElementById('user-avatar-btn');
    if (!userDropdown) return;

    const clickedInsideDropdown = userDropdown.contains(e.target);
    const clickedAvatar = userAvatarBtn && (userAvatarBtn === e.target || userAvatarBtn.contains(e.target));

    if (clickedAvatar) {
      // Toggle: el avatar abre/cierra
      userDropdown.classList.toggle('open');
      return;
    }
    if (!clickedInsideDropdown) {
      userDropdown.classList.remove('open');
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAllModals();
      hideUserMenu();
    }
  });
}

export function animateStats() {
  const statElements = ['stat-pros', 'stat-jobs', 'stat-cities', 'stat-rating'];
  const targets = [150, 1250, 45, 4.7];
  
  statElements.forEach((id, index) => {
    const el = document.getElementById(id);
    if (!el) return;
    
    const target = targets[index];
    const isFloat = index === 3;
    let current = 0;
    const increment = target / 50;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = isFloat ? current.toFixed(1) : Math.floor(current);
    }, 30);
  });
}

export async function updateAuthUI() {
  const isLogged = !!store.currentUser;
  
  const navLoginBtn = document.getElementById('btn-login-nav');
  const navRegBtn = document.getElementById('btn-register-nav');
  const navUserMenu = document.getElementById('nav-user-menu');
  const mobileLoginLink = document.getElementById('mobile-login-link');
  const mobilePanelLink = document.getElementById('mobile-panel-link');
  const notifBtn = document.getElementById('notif-btn');

  if (navLoginBtn) navLoginBtn.style.display = isLogged ? 'none' : 'inline-block';
  if (navRegBtn) navRegBtn.style.display = isLogged ? 'none' : 'inline-block';
  if (navUserMenu) navUserMenu.style.display = isLogged ? 'flex' : 'none';
  if (mobileLoginLink) mobileLoginLink.style.display = isLogged ? 'none' : 'block';
  if (mobilePanelLink) mobilePanelLink.style.display = isLogged ? 'block' : 'none';
  if (notifBtn) notifBtn.style.display = isLogged ? 'block' : 'none';
  
  if (isLogged) {
    const meta = store.currentUser.user_metadata || {};
    const name = meta.full_name || meta.name || store.currentUser.email || 'U';
    let avatarUrl = meta.avatar_url || meta.picture || null;
    
    // Cargar avatar desde profiles si no está en metadata
    if (!avatarUrl && store.currentUser.id) {
      const { getSupabase } = await import('./supabase.js');
      const sb = getSupabase();
      try {
        const { data: profile } = await sb.from('profiles').select('avatar_url').eq('id', store.currentUser.id).single();
        if (profile && profile.avatar_url) {
          avatarUrl = profile.avatar_url;
          if (store.currentUser.user_metadata) {
            store.currentUser.user_metadata.avatar_url = avatarUrl;
          }
        }
      } catch (err) {
        console.warn('Could not load avatar:', err);
      }
    }
    
    // Avatar: foto o inicial
    const userAvatarBtn = document.getElementById('user-avatar-btn');
    if (userAvatarBtn) {
      if (avatarUrl) {
        userAvatarBtn.innerHTML = `<img src="${avatarUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" alt="${name}">`;
      } else {
        userAvatarBtn.textContent = name.charAt(0).toUpperCase();
      }
    }
    
    // Nombre en el menú desplegable
    const menuUserName = document.getElementById('menu-user-name');
    if (menuUserName) menuUserName.textContent = name.split(' ')[0];

    // Label "Mi Panel" — siempre igual, el switch indica a dónde va
    const menuDashLabel = document.getElementById('menu-dashboard-label');
    if (menuDashLabel) menuDashLabel.textContent = 'Mi Panel';

    // Switch de panel si tiene perfil pro
    const switchProBtn  = document.getElementById('menu-switch-pro');
    const activateProBtn = document.getElementById('menu-activate-pro');
    if (switchProBtn && activateProBtn) {
      if (store.isPro) {
        switchProBtn.style.display = 'flex';
        const switchLabel = document.getElementById('menu-switch-pro-label');
        if (switchLabel) {
          // Muestra el panel al que VA a cambiar (no el actual)
          switchLabel.textContent = store.activePanel === 'pro' ? 'Ir al Panel Cliente' : 'Ir al Panel Profesional';
        }
        activateProBtn.style.display = 'none';
      } else if (!store.isAdmin) {
        activateProBtn.style.display = 'flex';
        switchProBtn.style.display = 'none';
      }
    }

    // Nombre de bienvenida en dashboard
    const dashUserName = document.getElementById('dash-user-name');
    if (dashUserName) dashUserName.textContent = name.split(' ')[0];
  }
}
