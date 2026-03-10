import { store } from './store.js';
import { registerFingerprint } from './security.js';
import { getSupabase, onAuthStateChange } from './supabase.js';
import { showToast, updateAuthUI, showPage, closeModal, showModal } from './ui.js';

// Helper: insert o update de professionals sin depender de UNIQUE constraint en DB
async function saveProfessional(sb, userId, data) {
  const { data: existing } = await sb.from('professionals')
    .select('id').eq('user_id', userId).maybeSingle();
  if (existing) {
    return sb.from('professionals').update(data)
      .eq('user_id', userId).select().maybeSingle();
  } else {
    return sb.from('professionals').insert({ user_id: userId, ...data })
      .select().maybeSingle();
  }
}



export async function initAuth() {
  const sb = getSupabase();
  if (!sb) return;

  // sessionHandled evita que onAuthStateChange duplique el work del getSession() inicial
  let sessionHandled = false;

  try {
    // Procesar sesión inicial (incluye callback de OAuth con hash o code)
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      sessionHandled = true;
      await handleSession(session);
      // Limpiar URL si venía con hash de OAuth
      if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      await redirectAfterLogin();
    }

    sb.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth]', event, '| sessionHandled:', sessionHandled);

      if (event === 'SIGNED_IN' && session) {
        if (sessionHandled) {
          sessionHandled = false;
          return; // ya procesado por getSession() arriba
        }
        await handleSession(session);
        window.history.replaceState(null, '', window.location.pathname);
        await redirectAfterLogin();

      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Actualizar usuario en store sin redirigir
        store.setCurrentUser(session.user);

      } else if (event === 'SIGNED_OUT') {
        sessionHandled = false;
        handleLogout();

      } else if (event === 'USER_UPDATED' && session) {
        store.setCurrentUser(session.user);
        updateAuthUI();
      }
    });
  } catch (e) {
    console.error('Auth init error:', e.message);
  }
}

export async function handleSession(session) {
  const sb = getSupabase();
  store.setCurrentUser(session.user);

  // Leer perfil
  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  // Buscar registro profesional (cualquier usuario puede tenerlo)
  const { data: prof } = await sb
    .from('professionals')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  store.setCurrentPro(prof);

  // Admin sigue siendo rol especial
  const meta = session.user.user_metadata || {};
  const role = profile?.role === 'admin' ? 'admin' : null;
  store.setCurrentRole(role);

  // Si venía del registro con rol professional, crear perfil pro si no existe
  if (meta.role === 'professional' && !prof) {
    const { data: newPro } = await sb.from('professionals').insert({
      user_id: session.user.id,
      specialty: 'General',
      city: '', province: '', description: ''
    }).select().maybeSingle();
    store.setCurrentPro(newPro);
  }

  updateAuthUI();

  // Registrar huella de dispositivo (anti-duplicados)
  registerFingerprint(session.user.id).catch(() => {});

  // Si es usuario de Google nuevo (sin perfil pro y sin rol definido) → preguntar
  const isGoogle = session.user.app_metadata?.provider === 'google';
  const isNew = !profile && !prof;
  if (isGoogle && isNew) {
    store._pendingRoleSession = session;
    setTimeout(() => {
      showModal('modal-choose-role');
      import('./professionals.js').then(m => {
        const sel = document.getElementById('choose-specialty');
        if (sel && sel.options.length <= 1) m.loadSpecialties(sel);
      });
    }, 300);
    return;
  }

  const { setupNotifBadge } = await import('./notifications.js');
  setupNotifBadge();
}

export function handleLogout() {
  store.reset();
  updateAuthUI();
  showPage('home');
}

export async function loginEmail() {
  const sb = getSupabase();
  const email = document.getElementById('login-email')?.value.trim();
  const pass = document.getElementById('login-pass')?.value;
  const errEl = document.getElementById('login-error');
  
  if (errEl) errEl.classList.add('hidden');

  if (!email || !pass) {
    showAuthError(errEl, 'Completá todos los campos.');
    return;
  }
  
  const btn = document.getElementById('btn-login');
  setBtnLoading(btn, 'Ingresando...');
  
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  
  setBtnLoading(btn, null, 'Ingresar');
  
  if (error) {
    showAuthError(errEl, translateAuthError(error.message));
  } else {
    closeModal('modal-login');
    showToast('¡Bienvenido de nuevo!', 'success');
    await redirectAfterLogin();
  }
}

export async function registerEmail() {
  const sb = getSupabase();
  const name     = document.getElementById('reg-name')?.value.trim();
  const email    = document.getElementById('reg-email')?.value.trim();
  const pass     = document.getElementById('reg-pass')?.value;
  const role     = document.getElementById('reg-role')?.value || 'user';
  const errEl    = document.getElementById('reg-error');
  
  if (errEl) errEl.classList.add('hidden');

  if (!name || !email || !pass) {
    showAuthError(errEl, 'Completá todos los campos obligatorios.');
    return;
  }
  if (pass.length < 6) {
    showAuthError(errEl, 'La contraseña debe tener al menos 6 caracteres.');
    return;
  }

  // Datos extra para profesional
  const specialty = document.getElementById('reg-specialty')?.value || 'General';
  const city      = document.getElementById('reg-city')?.value.trim() || '';
  const province  = document.getElementById('reg-province')?.value.trim() || '';
  const whatsapp  = document.getElementById('reg-whatsapp')?.value.trim() || '';

  if (role === 'professional' && !specialty) {
    showAuthError(errEl, 'Seleccioná tu especialidad principal.');
    return;
  }

  const btn = document.getElementById('btn-register');
  setBtnLoading(btn, 'Creando cuenta...');

  const { data, error } = await sb.auth.signUp({
    email,
    password: pass,
    options: { data: { full_name: name, role } }
  });

  setBtnLoading(btn, null, 'Crear cuenta');

  if (error) {
    showAuthError(errEl, translateAuthError(error.message));
    return;
  }

  // Crear perfil manualmente (por si el trigger falla)
  if (data.user) {
    await sb.from('profiles').upsert({
      id: data.user.id,
      full_name: name,
      role,
    }, { onConflict: 'id', ignoreDuplicates: true });

    if (role === 'professional') {
      await sb.from('professionals').upsert({
        user_id: data.user.id,
        specialty: specialty || 'General',
        city,
        province,
        whatsapp,
        description: ''
      });
      // Guardar pro sin depender de UNIQUE constraint
      await saveProfessional(sb, data.user.id, {
        specialty: specialty || 'General',
        city,
        province,
        whatsapp,
        description: ''
      });
    }
  }

  closeModal('modal-register');

  // Si el email necesita confirmación
  if (data.user && !data.session) {
    showToast('¡Cuenta creada! Revisá tu email para verificar.', 'success');
  } else {
    showToast('¡Bienvenido/a a TECNIYA!', 'success');
    await redirectAfterLogin();
  }
}

export async function loginGoogle() {
  const sb = getSupabase();
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: false }
  });
  if (error) showToast(translateAuthError(error.message), 'error');
}

export async function logout() {
  const sb = getSupabase();
  try {
    await sb.auth.signOut({ scope: 'local' }); // 'local' evita revocar sesión de otros tabs
  } catch (e) {
    console.warn('signOut error (ignorado):', e.message);
  }
  // Limpiar store y UI sin esperar evento SIGNED_OUT (que a veces no llega con Google)
  store.reset();
  updateAuthUI();
  const userDropdown = document.getElementById('user-dropdown');
  if (userDropdown) userDropdown.style.display = 'none';
  showPage('home');
  showToast('Sesión cerrada', 'info');
}

export async function redirectAfterLogin() {
  const { updateAuthUI } = await import('./ui.js');

  if (store.isAdmin) {
    store.setActivePanel('admin');
    updateAuthUI();
    showPage('admin');
    const { loadAdminData } = await import('./admin.js');
    loadAdminData();

  } else if (store.isPro) {
    // Tiene perfil profesional → panel profesional
    store.setActivePanel('pro');
    updateAuthUI();
    showPage('pro-dashboard');
    const { loadProDashboard } = await import('./dashboard.js');
    loadProDashboard();

  } else {
    // Cliente común → inicio
    store.setActivePanel('user');
    updateAuthUI();
    showPage('home');
  }

  // Mostrar tour para nuevos usuarios
  setTimeout(() => {
    import('./tour.js').then(m => m.checkAndShowTour());
  }, 1500);
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function showAuthError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function setBtnLoading(btn, loadingText, resetText) {
  if (!btn) return;
  if (loadingText) {
    btn.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;margin-right:8px;vertical-align:middle;"></span>${loadingText}`;
    btn.disabled = true;
  } else {
    btn.innerHTML = resetText || btn.dataset.originalText || 'Confirmar';
    btn.disabled = false;
  }
}

function translateAuthError(msg) {
  const map = {
    'Invalid login credentials':         'Email o contraseña incorrectos.',
    'Email not confirmed':                'Confirmá tu email antes de ingresar.',
    'User already registered':            'Ya existe una cuenta con ese email.',
    'Password should be at least 6':      'La contraseña debe tener al menos 6 caracteres.',
    'Unable to validate email address':   'El formato del email no es válido.',
    'Email rate limit exceeded':          'Demasiados intentos. Esperá unos minutos.',
    'For security purposes':              'Por seguridad, esperá antes de intentar de nuevo.',
    'signup is disabled':                 'El registro está temporalmente deshabilitado.',
  };
  for (const [key, val] of Object.entries(map)) {
    if (msg.includes(key)) return val;
  }
  return msg;
}

export async function activateProProfile() {
  if (!store.currentUser) return;
  const sb = getSupabase();
  const specialty = document.getElementById('activate-specialty')?.value;
  const city      = document.getElementById('activate-city')?.value.trim() || '';
  const province  = document.getElementById('activate-province')?.value.trim() || '';
  const whatsapp  = document.getElementById('activate-whatsapp')?.value.trim() || '';
  const errEl     = document.getElementById('activate-pro-error');

  if (!specialty) {
    if (errEl) { errEl.textContent = 'Seleccioná tu especialidad principal.'; errEl.classList.remove('hidden'); }
    return;
  }

  const { data: profile } = await sb.from('profiles').select('avatar_url').eq('id', store.currentUser.id).maybeSingle();
  if (!profile?.avatar_url) {
    if (errEl) { errEl.textContent = 'Tenés que agregar una foto de perfil primero.'; errEl.classList.remove('hidden'); }
    return;
  }

  const btn = document.getElementById('btn-activate-pro');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span style="opacity:0.7">Activando...</span>'; }

  const { data: newPro, error } = await saveProfessional(sb, store.currentUser.id, {
    specialty,
    city,
    province,
    whatsapp,
    description: ''
  });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-wrench"></i>Activar perfil profesional'; }

  if (error) {
    if (errEl) { errEl.textContent = 'Error al activar el perfil. Intentá de nuevo.'; errEl.classList.remove('hidden'); }
    return;
  }

  store.setCurrentPro(newPro);
  store.setActivePanel('pro');
  closeModal('modal-activate-pro');
  showToast('¡Perfil profesional activado!', 'success');

  const { updateAuthUI } = await import('./ui.js');
  updateAuthUI();

  const { loadProDashboard } = await import('./dashboard.js');
  showPage('pro-dashboard');
  loadProDashboard();
}

export function chooseRole(role) {
  store._chosenRole = role;
  // Estilo visual de las cards
  const cardUser = document.getElementById('choose-card-user');
  const cardPro  = document.getElementById('choose-card-professional');
  if (cardUser) cardUser.style.borderColor = role === 'user' ? 'var(--accent)' : 'var(--border)';
  if (cardPro)  cardPro.style.borderColor  = role === 'professional' ? 'var(--orange)' : 'var(--border)';
  // Mostrar campos extra para profesional
  const proFields = document.getElementById('choose-role-pro-fields');
  if (proFields) proFields.style.display = role === 'professional' ? 'block' : 'none';
  // Mostrar botón confirmar
  const btn = document.getElementById('btn-confirm-role');
  if (btn) btn.style.display = 'block';
}

export async function confirmChosenRole() {
  const sb = getSupabase();
  const role      = store._chosenRole || 'user';
  const specialty = document.getElementById('choose-specialty')?.value || 'General';
  const city      = document.getElementById('choose-city')?.value.trim() || '';
  const province  = document.getElementById('choose-province')?.value.trim() || '';
  const errEl     = document.getElementById('choose-role-error');

  if (role === 'professional' && !specialty) {
    if (errEl) { errEl.textContent = 'Seleccioná tu especialidad.'; errEl.classList.remove('hidden'); }
    return;
  }

  const btn = document.getElementById('btn-confirm-role');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  const userId = store.currentUser?.id;
  if (!userId) return;

  // Guardar role en profiles
  await sb.from('profiles').upsert({ id: userId, role }, { onConflict: 'id' });
  store.setCurrentRole(role);

  // Si eligió profesional, crear registro en professionals
  if (role === 'professional') {
    const { data: newPro } = await saveProfessional(sb, userId, {
      specialty,
      specialties: specialty ? [specialty] : [],
      city,
      province,
      description: ''
    });
    store.setCurrentPro(newPro);
  }

  closeModal('modal-choose-role');

  const { setupNotifBadge } = await import('./notifications.js');
  setupNotifBadge();

  await redirectAfterLogin();
}

export async function forgotPassword() {
  const sb = getSupabase();
  const email = document.getElementById('forgot-email')?.value.trim();
  const errEl = document.getElementById('forgot-error');
  const sucEl = document.getElementById('forgot-success');
  if (errEl) errEl.classList.add('hidden');
  if (sucEl) sucEl.classList.add('hidden');

  if (!email) { showAuthError(errEl, 'Ingresá tu email.'); return; }

  const btn = document.getElementById('btn-forgot-pass');
  setBtnLoading(btn, 'Enviando...');

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/?reset=true'
  });

  setBtnLoading(btn, null, 'Enviar link');

  if (error) {
    showAuthError(errEl, translateAuthError(error.message));
  } else {
    if (sucEl) {
      sucEl.textContent = '✓ Te enviamos un email con el link para restablecer tu contraseña.';
      sucEl.classList.remove('hidden');
    }
  }
}

export function initAuthEventListeners() {
  const loginEmailBtn = document.getElementById('btn-login');
  if (loginEmailBtn) loginEmailBtn.addEventListener('click', loginEmail);
  
  const registerEmailBtn = document.getElementById('btn-register');
  if (registerEmailBtn) registerEmailBtn.addEventListener('click', registerEmail);
  
  const loginPassInput = document.getElementById('login-pass');
  if (loginPassInput) {
    loginPassInput.addEventListener('keypress', e => { if (e.key === 'Enter') loginEmail(); });
  }
  const loginEmailInput = document.getElementById('login-email');
  if (loginEmailInput) {
    loginEmailInput.addEventListener('keypress', e => { if (e.key === 'Enter') loginEmail(); });
  }

  const googleLoginBtn = document.getElementById('btn-google-login');
  if (googleLoginBtn) googleLoginBtn.addEventListener('click', loginGoogle);

  const googleRegisterBtn = document.getElementById('btn-google-register');
  if (googleRegisterBtn) googleRegisterBtn.addEventListener('click', loginGoogle);

  const logoutBtn = document.getElementById('menu-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });

  const navLoginBtn = document.getElementById('btn-login-nav');
  if (navLoginBtn) navLoginBtn.addEventListener('click', () => showModal('modal-login'));

  const navRegisterBtn = document.getElementById('btn-register-nav');
  if (navRegisterBtn) navRegisterBtn.addEventListener('click', () => showModal('modal-register'));

  const mobileLoginLink = document.getElementById('mobile-login-link');
  if (mobileLoginLink) mobileLoginLink.addEventListener('click', e => { e.preventDefault(); showModal('modal-login'); });

  // Olvidé mi contraseña
  document.getElementById('link-forgot-pass')?.addEventListener('click', e => {
    e.preventDefault(); closeModal('modal-login'); showModal('modal-forgot-pass');
  });
  document.getElementById('btn-forgot-pass')?.addEventListener('click', forgotPassword);
  document.getElementById('link-back-to-login')?.addEventListener('click', e => {
    e.preventDefault(); closeModal('modal-forgot-pass'); showModal('modal-login');
  });
}
