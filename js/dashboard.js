import { store } from './store.js';
import { getSupabase } from './supabase.js';
import { showToast, closeModal, showPage } from './ui.js';
import { jobItem } from './jobs.js';

// ─── DASHBOARD CLIENTE ────────────────────────────────────────────────────────

export async function loadUserDashboard() {
  if (!store.currentUser) return;

  const sb = getSupabase();

  // Nombre de bienvenida
  const name = store.currentUser.user_metadata?.full_name
    || store.currentUser.email?.split('@')[0]
    || 'Usuario';
  const dashName = document.getElementById('dash-user-name');
  if (dashName) dashName.textContent = name.split(' ')[0];

  // Pre-llenar formulario de perfil
  const editName  = document.getElementById('edit-name');
  const editEmail = document.getElementById('edit-email');
  const editPhone = document.getElementById('edit-phone');
  const editCity  = document.getElementById('edit-city');
  if (editName)  editName.value  = store.currentUser.user_metadata?.full_name || '';
  if (editEmail) editEmail.value = store.currentUser.email || '';

  try {
    // Datos del perfil
    const { data: profile } = await sb.from('profiles')
      .select('*').eq('id', store.currentUser.id).maybeSingle();
    if (profile) {
      if (editPhone) editPhone.value = profile.phone || '';
      if (editCity)  editCity.value  = profile.city  || '';
      
      // Mostrar avatar en el formulario de edición
      const avatarPreview = document.getElementById('edit-avatar-preview');
      if (avatarPreview && profile.avatar_url) {
        avatarPreview.style.backgroundImage = `url('${profile.avatar_url}')`;
        avatarPreview.innerHTML = '';
      }
    }

    // Trabajos
    const { data: jobs } = await sb.from('jobs')
      .select('*')
      .eq('user_id', store.currentUser.id)
      .order('created_at', { ascending: false });

    const active  = (jobs || []).filter(j => ['solicitado','aceptado','en_proceso','fecha_propuesta_pro','pendiente_confirmacion','en_disputa'].includes(j.status));
    const done    = (jobs || []).filter(j => j.status === 'finalizado');
    const history = (jobs || []).filter(j => ['finalizado','cancelado','rechazado'].includes(j.status));

    setEl('user-stat-active', active.length);
    setEl('user-stat-done',   done.length);

    const jobsEl = document.getElementById('user-jobs-list');
    if (jobsEl) {
      jobsEl.innerHTML = active.length
        ? active.map(j => jobItem(j, 'user')).join('')
        : `<div class="empty-state"><i class="fa fa-briefcase"></i>
           <p>No tenés trabajos activos.<br>
           <a href="#" onclick="window.showPage('professionals-list')" style="color:var(--accent);">
           Buscar un profesional</a></p></div>`;
    }

    const histEl = document.getElementById('user-history-list');
    if (histEl) {
      histEl.innerHTML = history.length
        ? history.map(j => jobItem(j, 'user')).join('')
        : `<div class="empty-state"><i class="fa fa-clock-rotate-left"></i><p>Tu historial aparecerá aquí.</p></div>`;
    }
  } catch (e) {
    console.error('loadUserDashboard jobs:', e);
  }

  await loadFavorites();
  await loadUserBudgets();
}

export async function loadFavorites() {
  if (!store.currentUser) return;
  const sb = getSupabase();
  try {
    const { data: favs, error } = await sb
      .from('v_favorites_full')
      .select('*')
      .eq('user_id', store.currentUser.id);

    if (error) console.error('loadFavorites:', error);

    setEl('user-stat-favs', favs?.length || 0);

    const favsEl = document.getElementById('user-favs-grid');
    if (!favsEl) return;

    if (!favs?.length) {
      favsEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:40px;">
        <i class="fa fa-heart"></i><p>No guardaste profesionales favoritos.</p></div>`;
      return;
    }

    const { proCard } = await import('./professionals.js');
    favsEl.innerHTML = favs.map(f => proCard({
      id:            f.pro_id,
      user_id:       f.pro_user_id,
      name:          f.pro_name || 'Profesional',
      specialty:     f.specialty,
      city:          f.city,
      province:      f.province,
      description:   f.description,
      rating:        parseFloat(f.avg_rating) || 0,
      reviews_count: f.reviews_count || 0,
      jobs_count:    f.jobs_count || 0,
      is_featured:   f.is_featured,
      is_certified:  f.is_certified,
      is_online:     f.is_online,
      zones:         f.zones || [],
      whatsapp:      f.whatsapp,
    })).join('');
  } catch (e) {
    console.error('loadFavorites:', e);
  }
}

export async function loadUserHistory() {
  if (!store.currentUser) return;
  const sb = getSupabase();
  try {
    const { data: jobs } = await sb
      .from('jobs')
      .select('*')
      .eq('user_id', store.currentUser.id)
      .in('status', ['finalizado', 'cancelado', 'rechazado'])
      .order('created_at', { ascending: false });

    const histEl = document.getElementById('user-history-list');
    if (!histEl) return;
    histEl.innerHTML = jobs?.length
      ? jobs.map(j => jobItem(j, 'user')).join('')
      : `<div class="empty-state"><i class="fa fa-clock-rotate-left"></i><p>Tu historial aparecerá aquí.</p></div>`;
  } catch (e) { console.error('loadUserHistory:', e); }
}


export async function loadUserBudgets() {
  if (!store.currentUser) return;
  const sb = getSupabase();
  try {
    const { data: budgets } = await sb
      .from('budgets')
      .select('*')
      .eq('user_id', store.currentUser.id)
      .order('created_at', { ascending: false });

    setEl('user-stat-budgets', budgets?.length || 0);

    const budgetsEl = document.getElementById('user-budgets-list');
    if (!budgetsEl) return;

    if (!budgets?.length) {
      budgetsEl.innerHTML = `<div class="empty-state">
        <i class="fa fa-file-invoice"></i><p>No tenés presupuestos recibidos.</p></div>`;
      return;
    }

    budgetsEl.innerHTML = budgets.map(b => `
      <div class="job-item">
        <div class="job-icon" style="background:rgba(6,182,212,0.1);color:var(--accent);">
          <i class="fa fa-file-invoice"></i>
        </div>
        <div class="job-info">
          <div class="job-title">${escHtml(b.description || 'Presupuesto')}</div>
          <div class="job-meta">$${b.price || 0} · ${escHtml(b.client_name || '')}</div>
        </div>
        <span class="job-status status-${b.status || 'pending'}">${statusLabel(b.status)}</span>
      </div>
    `).join('');
  } catch (e) {
    console.error('loadUserBudgets:', e);
  }
}

// ─── DASHBOARD PROFESIONAL ────────────────────────────────────────────────────

export async function loadProDashboard() {
  if (!store.currentUser || !store.currentPro) return;

  const sb = getSupabase();

  setEl('pro-dash-specialty', store.currentPro.specialty || 'Tu especialidad');

  // Pre-llenar formulario de edición del pro
  setVal('pro-edit-name',      store.currentUser.user_metadata?.full_name || '');
  setVal('pro-edit-specialty', store.currentPro.specialty || '');
  setVal('pro-edit-desc',      store.currentPro.description || '');
  setVal('pro-edit-city',      store.currentPro.city || '');
  setVal('pro-edit-province',  store.currentPro.province || '');
  setVal('pro-edit-zones',     (store.currentPro.zones || []).join(', '));
  setVal('pro-edit-whatsapp',  store.currentPro.whatsapp || '');

  // Cargar avatar en el formulario de edición profesional
  const { data: profile } = await sb.from('profiles').select('avatar_url').eq('id', store.currentUser.id).single();
  if (profile?.avatar_url) {
    const avatarPreview = document.getElementById('pro-edit-avatar-preview');
    if (avatarPreview) {
      avatarPreview.style.backgroundImage = `url('${profile.avatar_url}')`;
      avatarPreview.innerHTML = '';
    }
  }

  try {
    // Jobs donde professional_id = profiles.id del usuario actual
    const { data: jobs } = await sb
      .from('jobs')
      .select('*')
      .eq('professional_id', store.currentUser.id)
      .order('created_at', { ascending: false });

    const newJ    = (jobs || []).filter(j => j.status === 'solicitado');
    const activeJ = (jobs || []).filter(j => ['aceptado','en_proceso'].includes(j.status));
    const doneJ   = (jobs || []).filter(j => j.status === 'finalizado');

    setEl('pro-stat-new',    newJ.length);
    setEl('pro-stat-active', activeJ.length);
    setEl('pro-stat-done',   doneJ.length);

    renderJobList('pro-jobs-new',     newJ,    'pro');
    renderJobList('pro-jobs-active',  activeJ, 'pro');
    renderJobList('pro-jobs-done',    doneJ,   'pro');

    // Cargar solicitudes urgentes
    await loadUrgentRequests();

    // Rating promedio
    const { data: reviews } = await sb
      .from('reviews')
      .select('rating')
      .eq('professional_id', store.currentUser.id);

    if (reviews?.length) {
      const avg = reviews.reduce((s, r) => s + parseFloat(r.rating), 0) / reviews.length;
      setEl('pro-stat-rating', avg.toFixed(1));
    }

  } catch (e) {
    console.error('loadProDashboard:', e);
  }

  // Presupuestos — solo para destacados
  const featuredBtn = document.getElementById('btn-new-budget');
  if (featuredBtn) featuredBtn.style.display = store.currentPro?.is_featured ? 'inline-flex' : 'none';

  if (!store.currentPro?.is_featured) {
    const tab = document.getElementById('tab-pro-presupuestos');
    if (tab) tab.innerHTML = `
      <div class="card" style="text-align:center;padding:40px;">
        <i class="fa fa-lock" style="font-size:2.5rem;color:var(--orange);margin-bottom:16px;display:block;"></i>
        <h3 style="font-size:1rem;margin-bottom:10px;">Función Destacados</h3>
        <p style="color:var(--gray);font-size:0.88rem;margin-bottom:20px;">
          Los presupuestos están disponibles para profesionales con Plan Destacado.</p>
        <button class="btn btn-orange" onclick="window.showSuscripcion()">
          <i class="fa fa-crown"></i>Activar Plan Destacado</button>
      </div>`;
  } else {
    await loadProBudgets();
  }

  await loadProWorkPhotos();
  loadProAvailability();
}

function loadProAvailability() {
  const avail = store.currentPro?.availability || {};
  const dias = avail.dias || [];
  ['lun','mar','mie','jue','vie','sab','dom'].forEach(d => {
    const labels = { lun:'Lunes', mar:'Martes', mie:'Miércoles', jue:'Jueves', vie:'Viernes', sab:'Sábado', dom:'Domingo' };
    const el = document.getElementById(`dia-${d}`);
    if (el) el.checked = dias.includes(labels[d]);
  });
  const desde = document.getElementById('hora-desde');
  const hasta  = document.getElementById('hora-hasta');
  const urg    = document.getElementById('urgencias');
  if (desde && avail.desde) desde.value = avail.desde;
  if (hasta && avail.hasta) hasta.value = avail.hasta;
  if (urg)   urg.checked = !!avail.urgencias;
  
  // Sincronizar toggle de estado online
  const toggle = document.getElementById('toggle-online-status');
  if (toggle) {
    toggle.checked = !!avail.urgencias;
    updateOnlineStatusUI(!!avail.urgencias);
  }
}

function updateOnlineStatusUI(isOnline) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (dot) {
    dot.style.color = isOnline ? 'var(--green)' : 'var(--gray)';
  }
  if (text) {
    text.textContent = isOnline ? 'Conectado' : 'Desconectado';
    text.style.color = isOnline ? 'var(--green)' : 'var(--gray)';
  }
}

async function loadProBudgets() {
  if (!store.currentPro) return;
  const sb = getSupabase();
  try {
    const { data: budgets } = await sb
      .from('budgets')
      .select('*')
      .eq('professional_id', store.currentPro.id)
      .order('created_at', { ascending: false });

    const el = document.getElementById('pro-budgets-list');
    if (!el) return;

    if (!budgets?.length) {
      el.innerHTML = `<div class="empty-state"><i class="fa fa-file-invoice"></i>
        <p>No generaste presupuestos aún.</p></div>`;
      return;
    }

    el.innerHTML = budgets.map(b => `
      <div class="job-item">
        <div class="job-icon" style="background:rgba(6,182,212,0.1);color:var(--accent);">
          <i class="fa fa-file-invoice"></i></div>
        <div class="job-info">
          <div class="job-title">${escHtml(b.client_name || 'Cliente')}</div>
          <div class="job-meta">${escHtml(b.description || '')} · $${b.price || 0}</div>
        </div>
        <span class="job-status">${b.date || ''}</span>
      </div>
    `).join('');
  } catch (e) { console.error('loadProBudgets:', e); }
}

async function loadProWorkPhotos() {
  if (!store.currentPro) return;
  const sb = getSupabase();
  try {
    const { data: photos } = await sb
      .from('work_photos')
      .select('*')
      .eq('professional_id', store.currentPro.id)
      .order('created_at', { ascending: false });

    const el = document.getElementById('pro-work-photos');
    if (!el) return;

    if (!photos?.length) {
      el.innerHTML = `<div class="empty-state"><i class="fa fa-images"></i>
        <p>No subiste fotos de trabajos aún.</p></div>`;
      return;
    }

    el.innerHTML = photos.map(p => `
      <div class="photo-thumb" style="position:relative;background-image:url('${p.photo_url}');background-size:cover;background-position:center;">
        <button onclick="window.deleteWorkPhoto('${p.id}')" title="Eliminar"
          style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);border:none;color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:0.7rem;display:flex;align-items:center;justify-content:center;">
          <i class="fa fa-times"></i></button>
        ${p.title ? `<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:#fff;font-size:0.7rem;padding:4px 6px;">${p.title}</div>` : ''}
      </div>
    `).join('')
  } catch (e) { console.error('loadProWorkPhotos:', e); }
}

// ─── ACCIONES ────────────────────────────────────────────────────────────────

let editAvatarFile = null;

export async function editAvatarSelected(input) {
  const file = input.files[0];
  if (!file) return;
  
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    showToast('Tipo de archivo no válido. Usá JPG, PNG o WebP', 'error');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    showToast('La imagen no puede superar 5MB', 'error');
    return;
  }
  
  editAvatarFile = file;
  
  const preview = document.getElementById('edit-avatar-preview');
  if (preview) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.style.backgroundImage = `url('${e.target.result}')`;
      preview.innerHTML = '';
    };
    reader.readAsDataURL(file);
  }
}

export async function saveProfile() {
  if (!store.currentUser) return;
  const sb = getSupabase();
  const name  = document.getElementById('edit-name')?.value.trim();
  const phone = document.getElementById('edit-phone')?.value.trim();
  const city  = document.getElementById('edit-city')?.value.trim();

  if (!name) { showToast('El nombre es obligatorio', 'error'); return; }

  let avatarUrl = null;
  
  if (editAvatarFile) {
    showToast('Subiendo foto...', 'info');
    const { uploadAvatar } = await import('./upload.js');
    avatarUrl = await uploadAvatar(editAvatarFile, store.currentUser.id);
    if (!avatarUrl) return;
    editAvatarFile = null;
  }

  const { data: profile } = await sb.from('profiles').select('avatar_url').eq('id', store.currentUser.id).single();
  if (!profile?.avatar_url && !avatarUrl) { showToast('La foto de perfil es obligatoria', 'error'); return; }

  const { error } = await sb.from('profiles').update({
    full_name: name, phone, city, updated_at: new Date().toISOString()
  }).eq('id', store.currentUser.id);

  if (error) { showToast('Error al guardar', 'error'); }
  else {
    showToast('Perfil actualizado', 'success');
    if (store.currentUser.user_metadata) store.currentUser.user_metadata.full_name = name;
    
    // Recargar datos del usuario para actualizar avatar en UI
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      store.setCurrentUser(user);
      const { updateAuthUI } = await import('./ui.js');
      updateAuthUI();
    }
  }
}

let proEditAvatarFile = null;

export async function proEditAvatarSelected(input) {
  const file = input.files[0];
  if (!file) return;
  
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    showToast('Tipo de archivo no válido. Usá JPG, PNG o WebP', 'error');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    showToast('La imagen no puede superar 5MB', 'error');
    return;
  }
  
  proEditAvatarFile = file;
  
  const preview = document.getElementById('pro-edit-avatar-preview');
  if (preview) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.style.backgroundImage = `url('${e.target.result}')`;
      preview.innerHTML = '';
    };
    reader.readAsDataURL(file);
  }
}

export async function saveProProfile() {
  if (!store.currentUser || !store.currentPro) return;
  const sb = getSupabase();
  const name      = document.getElementById('pro-edit-name')?.value.trim();
  // Leer especialidades del multi-selector
  const specialty = getSelectedSpecialties()[0] || '';
  const specialties = getSelectedSpecialties();
  const desc      = document.getElementById('pro-edit-desc')?.value.trim();
  const city      = document.getElementById('pro-edit-city')?.value.trim();
  const province  = document.getElementById('pro-edit-province')?.value.trim();
  const zones     = document.getElementById('pro-edit-zones')?.value.split(',').map(z => z.trim()).filter(Boolean);

  if (!name) { showToast('El nombre es obligatorio', 'error'); return; }
  if (!specialties.length) { showToast('Seleccioná al menos una especialidad', 'error'); return; }

  let avatarUrl = null;
  
  if (proEditAvatarFile) {
    showToast('Subiendo foto...', 'info');
    const { uploadAvatar } = await import('./upload.js');
    avatarUrl = await uploadAvatar(proEditAvatarFile, store.currentUser.id);
    if (!avatarUrl) return;
    proEditAvatarFile = null;
  }

  const { data: profile } = await sb.from('profiles').select('avatar_url').eq('id', store.currentUser.id).single();
  if (!profile?.avatar_url && !avatarUrl) { showToast('La foto de perfil es obligatoria', 'error'); return; }

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    sb.from('professionals').update({
      specialty: specialties[0] || specialty, specialties, description: desc, city, province, zones,
      updated_at: new Date().toISOString()
    }).eq('user_id', store.currentUser.id),
    sb.from('profiles').update({ full_name: name }).eq('id', store.currentUser.id)
  ]);

  if (e1 || e2) { showToast('Error al guardar', 'error'); }
  else {
    // Actualizar store local
    Object.assign(store.currentPro, { specialty: specialties[0]||specialty, specialties, description: desc, city, province, zones });
    showToast('Perfil actualizado', 'success');
    
    // Recargar datos del usuario para actualizar avatar en UI
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      store.setCurrentUser(user);
      const { updateAuthUI } = await import('./ui.js');
      updateAuthUI();
    }
    
    showPage('pro-dashboard');
  }
}

export async function saveAvailability() {
  if (!store.currentPro) return;
  const sb = getSupabase();
  const dias      = Array.from(document.querySelectorAll('#dias-laborales input:checked')).map(c => c.value);
  const desde     = document.getElementById('hora-desde')?.value;
  const hasta     = document.getElementById('hora-hasta')?.value;
  const urgencias = document.getElementById('urgencias')?.checked;

  let updateData = {
    availability: { dias, desde, hasta, urgencias },
    is_online: urgencias
  };

  // Si se está conectando, obtener ubicación
  if (urgencias && navigator.geolocation) {
    await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateData.latitude = position.coords.latitude;
          updateData.longitude = position.coords.longitude;
          console.log('DEBUG: Professional location saved:', updateData.latitude, updateData.longitude);
          showToast('Ubicación detectada', 'success');
          resolve();
        },
        (error) => {
          console.warn('Could not get location:', error);
          showToast('No se pudo detectar ubicación. Acepta permisos de ubicación para urgencias.', 'warning');
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  console.log('DEBUG: Saving professional data:', updateData);
  const { error } = await sb.from('professionals').update(updateData).eq('user_id', store.currentUser.id);

  if (error) { 
    console.error('saveAvailability:', error); 
    showToast('Error al guardar: ' + error.message, 'error'); 
  } else {
    if (store.currentPro) Object.assign(store.currentPro, { availability: { dias, desde, hasta, urgencias } });
    showToast(urgencias ? 'Conectado para urgencias' : 'Disponibilidad actualizada', 'success');
    
    // Actualizar UI del toggle
    const { updateOnlineStatusUI } = await import('./dashboard.js');
    if (typeof updateOnlineStatusUI === 'function') {
      updateOnlineStatusUI(urgencias);
    }
  }
}

export async function saveBudget() {
  if (!store.currentUser || !store.currentPro) return;
  const sb = getSupabase();
  const client = document.getElementById('budget-client')?.value.trim();
  const desc   = document.getElementById('budget-desc')?.value.trim();
  const price  = document.getElementById('budget-price')?.value;
  const date   = document.getElementById('budget-date')?.value;

  if (!client || !desc || !price) { showToast('Completá todos los campos', 'error'); return; }

  const { error } = await sb.from('budgets').insert({
    professional_id: store.currentPro.id,
    user_id: store.currentUser.id,
    client_name: client,
    description: desc,
    price: parseFloat(price),
    date: date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  });

  closeModal('modal-new-budget');
  if (error) { showToast('Error al guardar presupuesto', 'error'); }
  else { showToast('Presupuesto guardado', 'success'); await loadProBudgets(); }
}

export function generateBudgetPDF() {
  const client  = document.getElementById('budget-client')?.value;
  const desc    = document.getElementById('budget-desc')?.value;
  const price   = document.getElementById('budget-price')?.value;
  const date    = document.getElementById('budget-date')?.value;
  const proName = store.currentUser?.user_metadata?.full_name || 'Profesional';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#333;}
    h1{color:#4f46e5;}table{width:100%;border-collapse:collapse;margin-top:20px;}
    td{padding:10px;border:1px solid #ddd;}.total{font-weight:bold;font-size:1.2rem;color:#4f46e5;}
    </style></head><body>
    <h1>PRESUPUESTO - TECNIYA</h1>
    <p><strong>Profesional:</strong> ${proName}</p>
    <p><strong>Cliente:</strong> ${client}</p>
    <p><strong>Fecha:</strong> ${date}</p><hr>
    <h3>Descripción del trabajo</h3><p>${desc}</p>
    <table><tr><td>Total</td><td class="total">$${price}</td></tr></table>
    <br><p style="font-size:0.8rem;color:#999;">Generado por TECNIYA · AFM Solutions</p>
    </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}

export function sendBudgetWhatsApp() {
  const client  = document.getElementById('budget-client')?.value;
  const desc    = document.getElementById('budget-desc')?.value;
  const price   = document.getElementById('budget-price')?.value;
  const proName = store.currentUser?.user_metadata?.full_name || 'Profesional';
  const msg = encodeURIComponent(
    `Hola ${client}! Soy ${proName} de TECNIYA.\n\nPresupuesto para: ${desc}\nPrecio: $${price}\n\n¿Te parece bien? Podemos coordinar fecha y hora.`
  );
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function renderJobList(id, jobs, viewAs) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = jobs.length
    ? jobs.map(j => jobItem(j, viewAs)).join('')
    : `<div class="empty-state" style="padding:30px;">
        <i class="fa fa-briefcase"></i><p>Sin trabajos en esta categoría.</p></div>`;
}

function escHtml(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function statusLabel(status) {
  const map = { pending: 'Pendiente', accepted: 'Aceptado', rejected: 'Rechazado', expired: 'Vencido' };
  return map[status] || status || '';
}

// ─── HELPERS MULTI-ESPECIALIDADES ────────────────────────────────────────────

export function renderSpecialtyEditor(selected = []) {
  const container = document.getElementById('specialty-chips-editor');
  if (!container) return;
  
  // Cargar especialidades del store o de window
  let allSpecs = store.allSpecialties?.length ? store.allSpecialties : (window._allSpecialties || []);
  
  // Si está vacío, usar las default
  if (!allSpecs.length) {
    allSpecs = ['Electricista', 'Plomero', 'Carpintero', 'Pintor', 'Gasista', 'Albañil', 'Técnico HVAC', 'Cerrajero', 'Jardinero', 'Limpieza', 'Fumigador', 'Técnico PC', 'Técnico CEL', 'Otro'];
  }
  
  container.innerHTML = allSpecs.map(s => {
    const active = selected.includes(s) ? 'active' : '';
    return `<span class="specialty-chip specialty-chip--toggle ${active}" onclick="window.toggleSpecialtyChip(this,'${s}')">${s}</span>`;
  }).join('');
}

export function toggleSpecialtyChip(el, specialty) {
  el.classList.toggle('active');
}

export function getSelectedSpecialties() {
  const chips = document.querySelectorAll('#specialty-chips-editor .specialty-chip--toggle.active');
  return Array.from(chips).map(c => c.textContent.trim());
}

// Sistema de solicitudes urgentes para profesionales
export async function loadUrgentRequests() {
  const sb = getSupabase();
  if (!store.currentUser || !store.isPro) return;
  
  try {
    const { data: urgentReqs, error } = await sb
      .from('urgent_requests')
      .select('*, user:profiles!user_id(full_name)')
      .eq('status', 'solicitado')
      .contains('notified_pros', [store.currentUser.id])
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const container = document.getElementById('urgent-requests-list');
    const badge = document.getElementById('urgent-count-badge');
    
    if (!urgentReqs || urgentReqs.length === 0) {
      if (container) container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--gray);font-size:0.85rem;">No hay solicitudes urgentes en este momento</div>';
      if (badge) badge.style.display = 'none';
      return;
    }
    
    if (badge) {
      badge.textContent = urgentReqs.length;
      badge.style.display = 'inline-block';
    }
    
    if (container) {
      container.innerHTML = urgentReqs.map(req => renderUrgentRequestCard(req)).join('');
    }
    
  } catch (error) {
    console.error('Error loading urgent requests:', error);
  }
}

function renderUrgentRequestCard(req) {
  const userName = req.user?.full_name || 'Cliente';
  const timeAgo = getTimeAgo(new Date(req.created_at));
  
  return `
    <div class="card" style="background:linear-gradient(135deg, rgba(249,115,22,0.05), rgba(239,68,68,0.05));border:2px solid var(--orange);margin-bottom:12px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;right:0;background:var(--orange);color:white;padding:4px 12px;border-bottom-left-radius:8px;font-size:0.7rem;font-weight:700;">
        <i class="fa fa-bolt"></i> URGENTE
      </div>
      <div style="padding:16px;">
        <div style="display:flex;align-items:start;gap:12px;margin-bottom:12px;">
          <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:1.2rem;flex-shrink:0;">
            ${userName.charAt(0).toUpperCase()}
          </div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:0.95rem;margin-bottom:4px;">${escHtml(userName)}</div>
            <div style="font-size:0.75rem;color:var(--gray);">
              <i class="fa fa-clock"></i> ${timeAgo}
            </div>
          </div>
        </div>
        
        <div style="background:var(--darker);padding:12px;border-radius:8px;margin-bottom:12px;">
          <div style="font-size:0.85rem;font-weight:600;color:var(--orange);margin-bottom:6px;">
            <i class="fa fa-wrench"></i> ${escHtml(req.specialty)}
          </div>
          <div style="font-size:0.85rem;color:var(--light);margin-bottom:8px;">
            ${escHtml(req.description)}
          </div>
          <div style="font-size:0.8rem;color:var(--gray);">
            <i class="fa fa-location-dot"></i> ${escHtml(req.address || 'Sin dirección')}
          </div>
        </div>
        
        <div style="display:flex;gap:8px;">
          <button class="btn btn-success btn-sm" style="flex:1;" onclick="window.acceptUrgentRequest('${req.id}', '${req.user_id}')">
            <i class="fa fa-check"></i> Aceptar
          </button>
          <button class="btn btn-ghost btn-sm" onclick="window.openMapLocation(${req.latitude}, ${req.longitude})">
            <i class="fa fa-map"></i> Ver mapa
          </button>
        </div>
      </div>
    </div>
  `;
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Hace unos segundos';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  return `Hace ${Math.floor(hours / 24)} día${Math.floor(hours / 24) > 1 ? 's' : ''}`;
}

export async function acceptUrgentRequest(requestId, userId) {
  const sb = getSupabase();
  
  try {
    // Verificar que aún está disponible
    const { data: req, error: checkError } = await sb
      .from('urgent_requests')
      .select('status')
      .eq('id', requestId)
      .single();
    
    if (checkError) throw checkError;
    
    if (req.status !== 'solicitado') {
      showToast('Esta solicitud ya fue aceptada por otro profesional', 'warning');
      await loadUrgentRequests();
      return;
    }
    
    // Marcar como aceptada
    const { error: updateError } = await sb
      .from('urgent_requests')
      .update({ 
        status: 'aceptado',
        accepted_by: store.currentUser.id,
        accepted_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
    if (updateError) throw updateError;
    
    // Crear el trabajo asociado
    const { data: urgentReq } = await sb
      .from('urgent_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    const { error: jobError } = await sb.from('jobs').insert({
      user_id: userId,
      professional_id: store.currentUser.id,
      specialty: urgentReq.specialty,
      description: urgentReq.description,
      address: urgentReq.address,
      latitude: urgentReq.latitude,
      longitude: urgentReq.longitude,
      status: 'aceptado',
      is_urgent: true,
      created_at: new Date().toISOString()
    });
    
    if (jobError) throw jobError;
    
    showToast('¡Solicitud urgente aceptada! El cliente será notificado', 'success');
    await loadUrgentRequests();
    await loadProDashboard();
    
  } catch (error) {
    console.error('Error accepting urgent request:', error);
    showToast('Error al aceptar solicitud', 'error');
  }
}

window.acceptUrgentRequest = acceptUrgentRequest;
window.openMapLocation = (lat, lng) => {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
};
