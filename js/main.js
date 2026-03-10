import { store } from './store.js';
import { initFloatChat, toggleFloatChat, fchatGoList, fchatSearch, fchatOpenConv, fchatSend, fchatKeydown, fchatSendImage, openFloatChatWith, updateFChatBadge } from './floatChat.js';
window.__store = store;
import { initSupabase } from './supabase.js';
import { initAuth, redirectAfterLogin, initAuthEventListeners, chooseRole, confirmChosenRole, activateProProfile } from './auth.js';
import { showPage, showModal, closeModal, toggleMobileMenu, toggleUserMenu, hideUserMenu,
         initUIEvents, animateStats, showToast, scrollToSearch, switchTab, updateAuthUI } from './ui.js';
import { loadProfessionals, loadSpecialties, renderAllSections, showProProfile,
         toggleFilter, applyFilters, clearFilters, filterByType, initProfessionalsEvents } from './professionals.js';
import { loadAds, openAdLink, saveAd } from './ads.js';
import { detectLocation } from './geolocation.js';
import { checkAndShowTour } from './tour.js';
import { initRatingEvents } from './userRatings.js';
import { initUrgentAlerts, stopUrgentAlerts } from './urgentAlerts.js';
import { openJobRequest, submitJobRequest, toggleProSelection, updateMultiProBadge,
         updateProCardSelection, openMultiRequest,
         showUrgentModal, sendUrgentRequest,
         addFavorite, openRatingModal, setRating, submitRating,
         acceptJob, rejectJob, openRejectModal, startJob, finishJob,
         cancelJob, openCancelModal,
         confirmJobDate, clientConfirmFinish, submitDispute, reHireJob,
         openProposeDateModal, submitProposedDate, approveProDate, rejectProDate,
         openWarrantyReport, submitWarrantyReport,
         previewJobPhoto,
         initJobsEventListeners } from './jobs.js';
import { loadUserDashboard, loadProDashboard, loadFavorites, loadUserBudgets, loadUserHistory,
         renderSpecialtyEditor, toggleSpecialtyChip, getSelectedSpecialties,
         saveAvailability, saveProfile,
         saveProProfile, saveBudget, generateBudgetPDF,
         editAvatarSelected, proEditAvatarSelected } from './dashboard.js';
import { loadAdminSecurity } from './admin.js';
import { openReportModal, submitProReport } from './security.js';
import { loadAdminData, switchAdminTab, loadAdminPenalties, adminToggleBlock, adminToggleFeatured,
         adminDeleteAd, filterAdminTable } from './admin.js';
import { setupRealtimeNotifications, toggleNotifPanel, markAllRead, initNotificationsEvents, createNotification, handleNotifClick } from './notifications.js';
import { sendChatMsg, sendChatMsgBtn, initChatEvents, loadChatPage, openChatWith, cleanupChat, closeChat } from './chat.js';
import { showSuscripcion, subscribePro } from './subscriptions.js';
import { deleteWorkPhoto } from './upload.js';
import { initPWA, installPWA, generateManifest, initPWAEvents } from './pwa.js';
import { initStorage, initUploadEvents } from './upload.js';

// ─── Exponer globalmente (para onclick en HTML generado dinámicamente) ───────
window.showPage         = showPage;
window.closeModal       = closeModal;
window.showModal        = showModal;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleUserMenu   = toggleUserMenu;
window.hideUserMenu     = hideUserMenu;
window.showToast        = showToast;
window.scrollToSearch   = scrollToSearch;
window.switchTab        = switchTab;

window.showProProfile   = showProProfile;
window.applyFilters     = applyFilters;
window.clearFilters     = clearFilters;
window.filterByType     = filterByType;
window.toggleFilter     = toggleFilter;

window.openJobRequest        = openJobRequest;
window.toggleProSelection    = toggleProSelection;
window.handleNotifClick      = handleNotifClick;
window.openMultiRequest      = openMultiRequest;
window.clearMultiSelection   = () => {
  store.selectedPros = [];
  updateMultiProBadge();
  updateProCardSelection();
};
window.submitJobRequest = submitJobRequest;
window.showUrgentModal  = showUrgentModal;
window.sendUrgentRequest= sendUrgentRequest;
window.addFavorite      = addFavorite;
window.openRatingModal  = openRatingModal;
window.setRating        = setRating;
window.submitRating     = submitRating;
window.acceptJob        = acceptJob;
window.rejectJob        = rejectJob;
window.startJob         = startJob;
window.finishJob        = finishJob;
window.cancelJob        = cancelJob;
window.openCancelModal  = openCancelModal;
window.openRejectModal  = openRejectModal;
window.confirmJobDate   = confirmJobDate;
window.clientConfirmFinish = clientConfirmFinish;
window.submitDispute    = submitDispute;
window.reHireJob             = reHireJob;
window.openProposeDateModal  = openProposeDateModal;
window.submitProposedDate    = submitProposedDate;
window.approveProDate        = approveProDate;
window.rejectProDate         = rejectProDate;
window.openWarrantyReport    = openWarrantyReport;
window.submitWarrantyReport  = submitWarrantyReport;
window.toggleSpecialtyChip   = toggleSpecialtyChip;
window.previewJobPhoto  = previewJobPhoto;
window.openChatWith     = (userId, jobId, isPre) => openChatWith(userId, jobId, isPre);
window.deleteWorkPhoto  = deleteWorkPhoto;

// Helpers modales cancelar/rechazar
window.syncCancelReason = (val) => {
  const ta = document.getElementById('cancel-reason');
  if (ta && val && val !== 'Otro') ta.value = val;
  else if (ta && val === 'Otro') ta.value = '';
};
window.syncRejectReason = (val) => {
  const ta = document.getElementById('reject-reason');
  if (ta && val && val !== 'Otro') ta.value = val;
  else if (ta && val === 'Otro') ta.value = '';
};

window.openConfirmFinish = (jobId) => {
  store._confirmingJobId = jobId;
  const el = document.getElementById('confirm-finish-comment');
  if (el) el.value = '';
  showModal('modal-confirm-finish');
};

window.showSuscripcion  = showSuscripcion;
window.subscribePro     = subscribePro;
window.installPWA       = installPWA;
window.detectLocation   = detectLocation;

window.loadAdminData      = loadAdminData;
window.switchAdminTab     = switchAdminTab;
window.adminToggleBlock   = adminToggleBlock;
window.adminToggleFeatured= adminToggleFeatured;
window.adminDeleteAd      = adminDeleteAd;
window.filterAdminTable   = filterAdminTable;

window.toggleFloatChat        = toggleFloatChat;
window.fchatGoList            = fchatGoList;
window.fchatSearch            = fchatSearch;
window.fchatOpenConv          = fchatOpenConv;
window.fchatSend              = fchatSend;
window.fchatKeydown           = fchatKeydown;
window.fchatSendImage         = fchatSendImage;
window.toggleNotifPanel = toggleNotifPanel;
window.markAllRead      = markAllRead;

window.saveAvailability = saveAvailability;
window.saveProfile      = saveProfile;
window.saveProProfile   = saveProProfile;
window.saveBudget       = saveBudget;
window.generateBudgetPDF= generateBudgetPDF;
window.editAvatarSelected = editAvatarSelected;
window.proEditAvatarSelected = proEditAvatarSelected;

window.chooseRole        = chooseRole;
window.confirmChosenRole = confirmChosenRole;
window.activateProProfile = activateProProfile;
window.goBack = () => showPage(store.previousPage || 'home');

// ─── Funciones globales de UI para registro/login ───────────────────────────

window.selectRegisterRole = (role) => {
  document.getElementById('reg-role').value = role;
  const cardUser = document.getElementById('role-card-user');
  const cardPro  = document.getElementById('role-card-professional');
  if (cardUser)  cardUser.style.border  = role === 'user'         ? '2px solid var(--accent)' : '2px solid var(--border)';
  if (cardPro)   cardPro.style.border   = role === 'professional' ? '2px solid var(--accent)' : '2px solid var(--border)';
  const extraFields = document.getElementById('pro-extra-fields');
  if (extraFields) extraFields.style.display = role === 'professional' ? 'block' : 'none';
  // Cargar especialidades en el select del registro si no están cargadas
  if (role === 'professional') {
    import('./professionals.js').then(m => {
      const sel = document.getElementById('reg-specialty');
      if (sel && sel.options.length <= 1) m.loadSpecialties(sel);
    });
  }
};

window.togglePassVisibility = (inputId, btnId) => {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  if (btn) btn.innerHTML = isPass ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
};

window.checkPassStrength = (val) => {
  const fill  = document.getElementById('pass-strength-fill');
  const label = document.getElementById('pass-strength-label');
  if (!fill || !label) return;
  let strength = 0;
  if (val.length >= 6)  strength++;
  if (val.length >= 10) strength++;
  if (/[A-Z]/.test(val)) strength++;
  if (/[0-9]/.test(val)) strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;
  const levels = [
    { pct: '0%',   color: 'transparent', text: '' },
    { pct: '25%',  color: '#ef4444',     text: 'Muy débil' },
    { pct: '50%',  color: '#f97316',     text: 'Débil' },
    { pct: '75%',  color: '#eab308',     text: 'Media' },
    { pct: '90%',  color: '#22c55e',     text: 'Fuerte' },
    { pct: '100%', color: '#16a34a',     text: 'Muy fuerte' },
  ];
  const l = levels[Math.min(strength, 5)];
  fill.style.width = l.pct;
  fill.style.background = l.color;
  label.textContent = l.text;
  label.style.color = l.color;
};

window.closeMobileMenu = () => {
  document.getElementById('mobile-nav')?.classList.remove('open');
};

// ─── Helper ─────────────────────────────────────────────────────────────────
function on(id, ev, fn) {
  document.getElementById(id)?.addEventListener(ev, fn);
}

// ─── INIT ────────────────────────────────────────────────────────────────────
async function initApp() {
  await initSupabase();

  // Inicializar subsistemas
  initUIEvents();
  initAuthEventListeners();
  initProfessionalsEvents();
  initNotificationsEvents();
  initChatEvents();
  initPWAEvents();
  initJobsEventListeners();
  initPWA();

  // ── HEADER / NAV ────────────────────────────────────────────────────────
  on('logo-wrap',       'click', () => showPage('home'));
  on('hamburger-btn',   'click', toggleMobileMenu);

  on('nav-home',  'click', e => { e.preventDefault(); showPage('home'); });
  on('nav-pros',  'click', e => { e.preventDefault(); showPage('professionals-list'); });
  on('nav-how',   'click', e => { e.preventDefault(); showPage('how'); });
  on('nav-sub',   'click', e => { e.preventDefault(); showSuscripcion(); });

  on('mobile-home-link',  'click', e => { e.preventDefault(); showPage('home');                toggleMobileMenu(); });
  on('mobile-pros-link',  'click', e => { e.preventDefault(); showPage('professionals-list');  toggleMobileMenu(); });
  on('mobile-how-link',   'click', e => { e.preventDefault(); showPage('how');                 toggleMobileMenu(); });
  on('mobile-sub-link',   'click', e => { e.preventDefault(); showSuscripcion();               toggleMobileMenu(); });
  on('mobile-login-link', 'click', e => { e.preventDefault(); showModal('modal-login');        toggleMobileMenu(); });
  on('mobile-panel-link', 'click', e => { e.preventDefault(); redirectAfterLogin();            toggleMobileMenu(); });

  // ── MENÚ USUARIO ────────────────────────────────────────────────────────
  // Toggle del avatar manejado en el listener global de ui.js (evita race condition)
  on('menu-dashboard', 'click', async e => {
    e.preventDefault(); hideUserMenu();
    if (store.isAdmin) {
      showPage('admin');
    } else if (store.isPro && store.activePanel === 'pro') {
      const { loadProDashboard } = await import('./dashboard.js');
      showPage('pro-dashboard'); loadProDashboard();
    } else {
      store.setActivePanel('user');
      const { loadUserDashboard } = await import('./dashboard.js');
      showPage('user-dashboard'); loadUserDashboard();
    }
  });
  on('menu-profile',       'click', e => { e.preventDefault(); showPage('profile-edit'); hideUserMenu(); });
  // menu-chat ahora abre el chat flotante (manejado inline en el HTML)
  on('menu-logout',        'click', e => { e.preventDefault(); import('./auth.js').then(m => m.logout()); hideUserMenu(); });

  // Switch entre panel cliente y profesional
  on('menu-switch-pro', 'click', async e => {
    e.preventDefault(); hideUserMenu();
    if (store.activePanel === 'pro') {
      store.setActivePanel('user');
      updateAuthUI();
      const { loadUserDashboard } = await import('./dashboard.js');
      showPage('user-dashboard');
      loadUserDashboard();
    } else {
      store.setActivePanel('pro');
      updateAuthUI();
      const { loadProDashboard } = await import('./dashboard.js');
      showPage('pro-dashboard');
      loadProDashboard();
    }
  });

  // Activar perfil profesional por primera vez
  on('menu-activate-pro', 'click', e => {
    e.preventDefault(); hideUserMenu();
    showModal('modal-activate-pro');
    import('./professionals.js').then(m => {
      const sel = document.getElementById('activate-specialty');
      if (sel && sel.options.length <= 1) m.loadSpecialties(sel);
    });
  });
  // ── NOTIFICACIONES ──────────────────────────────────────────────────────
  on('notif-btn',        'click', toggleNotifPanel);
  on('mark-all-read-btn','click', markAllRead);

  // ── HERO ────────────────────────────────────────────────────────────────
  on('urgent-btn',  'click', showUrgentModal);
  on('search-btn',  'click', scrollToSearch);

  // ── BÚSQUEDA / FILTROS ──────────────────────────────────────────────────
  on('btn-search',           'click', () => { applyFilters(); showPage('professionals-list'); });
  on('btn-clear-filters',    'click', clearFilters);
  on('btn-detect-location',  'click', detectLocation);
  on('ad-banner-main',       'click', openAdLink);

  // ── VER TODOS ───────────────────────────────────────────────────────────
  on('see-all-destacados',   'click', () => { filterByType('destacado');   showPage('professionals-list'); });
  on('see-all-certificados', 'click', () => { filterByType('certificado'); showPage('professionals-list'); });
  on('see-all-top',          'click', () => {                               showPage('professionals-list'); });

  // ── FOOTER ──────────────────────────────────────────────────────────────
  on('footer-search',   'click', e => { e.preventDefault(); scrollToSearch(); });
  on('footer-how',      'click', e => { e.preventDefault(); showPage('how'); });
  on('footer-featured', 'click', e => { e.preventDefault(); showSuscripcion(); });
  on('footer-join',     'click', e => { e.preventDefault(); showModal('modal-register'); });
  on('footer-register', 'click', e => { e.preventDefault(); showModal('modal-register'); });
  on('footer-panel',    'click', e => { e.preventDefault(); redirectAfterLogin(); });
  on('link-search-pro', 'click', e => { e.preventDefault(); showPage('professionals-list'); });

  // ── MODALES AUTH ─────────────────────────────────────────────────────────
  on('link-to-register', 'click', e => { e.preventDefault(); closeModal('modal-login');    showModal('modal-register'); });
  on('link-to-login',    'click', e => { e.preventDefault(); closeModal('modal-register'); showModal('modal-login'); });

  // ── VOLVER ──────────────────────────────────────────────────────────────
  on('btn-back-pros',            'click', () => showPage(store.previousPage || 'home'));
  on('btn-back-profile',         'click', () => showPage(store.previousPage || 'home'));
  on('btn-back-profile-edit',    'click', () => showPage('user-dashboard'));
  on('btn-back-pro-profile-edit','click', () => showPage('pro-dashboard'));
  on('admin-back',               'click', () => showPage('home'));

  // ── DASHBOARD USUARIO ───────────────────────────────────────────────────
  on('btn-urgent-dash',  'click', showUrgentModal);
  on('btn-save-profile', 'click', saveProfile);

  // Tabs del dashboard de usuario — data-tab (no data-panel)
  document.querySelectorAll('#user-tabs .tab').forEach(tab => {
    tab.addEventListener('click', e => {
      switchTab(e, tab.dataset.tab);
      // Cargar datos cuando se abre el tab correspondiente
      const t = tab.dataset.tab;
      if (t === 'tab-favoritos')  loadFavorites();
      if (t === 'tab-historial')  loadUserHistory();
      if (t === 'tab-presupuestos') loadUserBudgets();
    });
  });

  // ── DASHBOARD PROFESIONAL ────────────────────────────────────────────────
  on('btn-edit-pro-profile',  'click', async () => {
    showPage('pro-profile-edit');
    const { renderSpecialtyEditor, loadProDashboard } = await import('./dashboard.js');
    await loadProDashboard();
    const container = document.getElementById('specialty-chips-editor');
    if (container && store.currentPro) {
      renderSpecialtyEditor(store.currentPro.specialties || [store.currentPro.specialty]);
    }
  });
  on('btn-featured-pro',      'click', showSuscripcion);
  on('btn-save-availability', 'click', saveAvailability);
  
  // Toggle conectado/desconectado para urgencias
  const toggleOnline = document.getElementById('toggle-online-status');
  if (toggleOnline) {
    toggleOnline.addEventListener('change', async () => {
      const isOnline = toggleOnline.checked;
      const urg = document.getElementById('urgencias');
      if (urg) urg.checked = isOnline;
      await saveAvailability();
    });
  }
  on('btn-save-pro-profile',  'click', saveProProfile);
  on('btn-new-budget',        'click', () => showModal('modal-new-budget'));
  on('btn-save-budget',       'click', saveBudget);
  on('btn-pdf-budget',        'click', generateBudgetPDF);
  on('btn-upload-photo',      'click', () => document.getElementById('photo-upload-input')?.click());
  on('photo-upload-input',    'change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!store.currentUser) return;
    const title = prompt('Título de la foto (opcional):') || '';
    const { uploadWorkPhoto } = await import('./upload.js');
    await uploadWorkPhoto(file, store.currentUser.id, title);
    e.target.value = '';
    const { loadProDashboard } = await import('./dashboard.js');
    loadProDashboard();
  });

  // Tabs del dashboard profesional — data-tab
  document.querySelectorAll('#pro-tabs .tab').forEach(tab => {
    tab.addEventListener('click', e => {
      switchTab(e, tab.dataset.tab);
    });
  });

  // ── ADMIN ────────────────────────────────────────────────────────────────
  on('btn-new-ad',  'click', () => showModal('modal-new-ad'));
  on('btn-save-ad', 'click', saveAd);

  // Sidebar del admin
  document.querySelectorAll('.admin-sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      if (tab) switchAdminTab(tab);
    });
  });

  // Buscador de admin
  on('search-users', 'input', e => filterAdminTable(e.target.value, 'users-table'));

  // ── MODALES DE JOBS ──────────────────────────────────────────────────────
  on('btn-submit-job',    'click', submitJobRequest);
  on('urgent-btn',        'click', showUrgentModal);
  on('btn-send-urgent',   'click', sendUrgentRequest);
  on('btn-submit-rating', 'click', submitRating);

  // Estrellas de rating
  ['puntualidad','calidad','precio','comunicacion'].forEach(cat => {
    document.querySelectorAll(`#stars-${cat} .star`).forEach(star => {
      star.addEventListener('click', e => setRating(e, cat));
    });
  });

  // ── SUSCRIPCIÓN ──────────────────────────────────────────────────────────
  on('btn-subscribe',    'click', subscribePro);

  // ── CÓMO FUNCIONA ────────────────────────────────────────────────────────
  on('btn-register-how', 'click', () => showModal('modal-register'));

  // ── CHAT ─────────────────────────────────────────────────────────────────
  on('btn-send-chat', 'click', sendChatMsgBtn);
  on('chat-input-field', 'keypress', sendChatMsg);

  // ── PWA ──────────────────────────────────────────────────────────────────
  on('btn-install-pwa', 'click', installPWA);
  on('btn-close-pwa',   'click', () => document.getElementById('pwa-banner')?.classList.add('pwa-banner-hidden'));

  // ── MODAL - cerrar con botones data-close ────────────────────────────────
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // ─── CARGA INICIAL ──────────────────────────────────────────────────────
  generateManifest();

  await loadSpecialties();
  await loadAds();
  await loadProfessionals();
  // Re-mostrar el ad después de que loadProfessionals termine (puede sobreescribir)
  const { showAd: _showAd } = await import('./ads.js');
  _showAd('nacional');

  initStorage();
  initUploadEvents();
  initRatingEvents();
  animateStats();
  setupRealtimeNotifications();
  
  // Iniciar sistema de alertas urgentes si es profesional
  if (store.isPro && store.currentUser) {
    initUrgentAlerts();
  }

  setTimeout(() => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, 1200);

  initAuth();
}

window.addEventListener('DOMContentLoaded', initApp);

window.switchPenaltyTab = function(tabId) {
  document.querySelectorAll('.pen-tab-panel').forEach(p => p.style.display = 'none');
  const el = document.getElementById(tabId);
  if (el) el.style.display = 'block';
  document.querySelectorAll('#admin-penalties .tab').forEach((t, i) => {
    const ids = ['pen-tab-pros','pen-tab-reports','pen-tab-history'];
    t.classList.toggle('active', ids[i] === tabId);
  });
};

window.switchSecurityTab = function(tabId) {
  document.querySelectorAll('.sec-tab-panel').forEach(p => p.style.display = 'none');
  const el = document.getElementById(tabId);
  if (el) el.style.display = 'block';
  const ids = ['sec-suspicious','sec-cancels','sec-reports'];
  document.querySelectorAll('#admin-security .tab').forEach((t, i) => {
    t.classList.toggle('active', ids[i] === tabId);
  });
};
