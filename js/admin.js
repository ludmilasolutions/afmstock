import { getSupabase } from './supabase.js';
import { showToast, showPage } from './ui.js';
import { formatDate } from './utils.js';

console.log('[admin.js] Loading...');

export async function loadAdminData() {
  const sb = getSupabase();
  
  try {
    const [{ count: uc }, { count: pc }, { count: fc }, { count: jc }] = await Promise.all([
      sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'professional'),
      sb.from('professionals').select('*', { count: 'exact', head: true }).eq('is_featured', true),
      sb.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'finalizado'),
    ]);
    
    updateStat('adm-stat-users', uc || 0);
    updateStat('adm-stat-pros', pc || 0);
    updateStat('adm-stat-featured', fc || 0);
    updateStat('adm-stat-jobs', jc || 0);
    
    await Promise.all([
      loadAdminUsers(),
      loadAdminPros(),
      loadAdminJobs(),
      loadAdminSubscriptions(),
      loadAdminAds(),
      loadAdminReviews()
    ]);
  } catch (e) {
    console.log('Admin data:', e.message);
  }
}

function updateStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function loadAdminUsers() {
  const sb = getSupabase();
  
  const { data: users } = await sb
    .from('profiles')
    .select('id,full_name,role,blocked,cancel_count,warning_count,created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--gray);">No hay usuarios</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td style="font-size:0.78rem;color:var(--gray2);">${u.id.slice(0, 8)}...</td>
      <td>${escapeHtml(u.full_name || '-')}</td>
      <td><span class="badge badge-${u.role === 'admin' ? 'destacado' : u.role === 'professional' ? 'certificado' : 'disponible'}">${u.role || 'user'}</span></td>
      <td>${u.created_at ? formatDate(u.created_at) : '-'}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="window.adminEditUser('${u.id}')" title="Editar"><i class="fa fa-pencil"></i></button>
        <button class="btn btn-${u.blocked ? 'success' : 'danger'} btn-sm" onclick="window.adminToggleBlock('${u.id}', ${!u.blocked})" title="${u.blocked ? 'Desbloquear' : 'Bloquear'}">
          <i class="fa fa-${u.blocked ? 'unlock' : 'ban'}"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function loadAdminPros() {
  const sb = getSupabase();
  
  const { data: pros } = await sb
    .from('professionals')
    .select('id,user_id,specialty,city,avg_rating,is_featured,suspended,ranking_score,cancel_count,report_count,created_at,profiles:user_id(full_name,blocked)')
    .order('created_at', { ascending: false })
    .limit(100);

  const tbody = document.getElementById('pros-tbody');
  if (!tbody) return;

  if (!pros || pros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--gray);">No hay profesionales</td></tr>';
    return;
  }

  tbody.innerHTML = pros.map(p => {
    const sc = p.ranking_score ?? 100;
    const scColor = sc >= 80 ? 'var(--green)' : sc >= 50 ? 'var(--orange)' : '#f87171';
    const estado = p.suspended ? '<span class="badge badge-destacado">Suspendido</span>'
                 : p.profiles?.blocked ? '<span class="badge badge-destacado">Bloqueado</span>'
                 : '<span class="badge badge-disponible">Activo</span>';
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="chat-conv-avatar" style="width:32px;height:32px;font-size:0.75rem;">
            ${p.profiles?.full_name?.charAt(0) || 'P'}
          </div>
          <div>
            <div>${escapeHtml(p.profiles?.full_name || '-')}</div>
            <div style="font-size:0.72rem;color:var(--gray);">${escapeHtml(p.city || '')}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(p.specialty || '-')}</td>
      <td>${p.avg_rating ? p.avg_rating.toFixed(1)+'★' : '—'}</td>
      <td><span style="font-weight:700;color:${scColor};">${sc}</span></td>
      <td>${estado} ${p.is_featured ? '<span class="badge badge-nuevo" style="margin-left:4px;">★</span>' : ''}</td>
      <td style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm" onclick="window.adminViewPro('${p.id}')" title="Ver detalle"><i class="fa fa-eye"></i></button>
        <button class="btn btn-${p.is_featured ? 'danger' : 'accent'} btn-sm" onclick="window.adminToggleFeatured('${p.id}',${!p.is_featured})" title="${p.is_featured ? 'Quitar destacado' : 'Destacar'}"><i class="fa fa-crown"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="window.adminOpenPenaltyModal('${p.id}','${escapeHtml(p.profiles?.full_name||'')}')" title="Penalizar"><i class="fa fa-gavel"></i></button>
      </td>
    </tr>`;
  }).join('');
}

async function loadAdminJobs() {
  const sb = getSupabase();
  
  const { data: jobs, error: jobErr } = await sb
    .from('jobs')
    .select('id,user_id,professional_id,status,specialty,address,created_at,is_urgent,profiles:user_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  const tbody = document.getElementById('jobs-tbody');
  if (!tbody) return;

  if (!jobs || jobs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--gray);">No hay trabajos</td></tr>';
    return;
  }
  
  tbody.innerHTML = jobs.map(j => `
    <tr>
      <td style="font-size:0.78rem;color:var(--gray2);">${j.id.slice(0, 8)}...</td>
      <td>${escapeHtml(j.profiles?.full_name || '-')}</td>
      <td>${escapeHtml(j.specialty || '-')}${j.is_urgent ? ' <i class="fa fa-bolt" style="color:var(--orange);font-size:0.7rem;"></i>' : ''}</td>
      <td><span class="job-status status-${j.status}">${j.status}</span></td>
      <td>${j.created_at ? formatDate(j.created_at) : '-'}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="window.adminViewJob('${j.id}')" title="Ver"><i class="fa fa-eye"></i></button>
        ${j.status !== 'finalizado' && j.status !== 'cancelado' ? `<button class="btn btn-danger btn-sm" onclick="window.adminCancelJob('${j.id}')" title="Cancelar"><i class="fa fa-times"></i></button>` : ''}
      </td>
    </tr>
  `).join('');
}

async function loadAdminSubscriptions() {
  const sb = getSupabase();
  
  const { data: subs } = await sb
    .from('subscriptions')
    .select('id,professional_id,user_id,type,status,starts_at,ends_at,cancelled_at,created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const tbody = document.getElementById('subs-tbody');
  if (!tbody) return;

  if (!subs || subs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--gray);">No hay suscripciones</td></tr>';
    return;
  }

  tbody.innerHTML = subs.map(s => `
    <tr>
      <td>${'-'}</td>
      <td><span class="badge badge-${s.type === 'destacado' ? 'destacado' : 'nuevo'}">${s.type}</span></td>
      <td>${s.starts_at ? formatDate(s.starts_at) : '-'}</td>
      <td>${s.ends_at ? formatDate(s.ends_at) : '-'}</td>
      <td><span class="badge badge-${s.status === 'active' ? 'disponible' : s.status === 'cancelled' ? 'certificado' : 'nuevo'}">${s.status}</span></td>
      <td>
        ${s.status === 'active' ? `<button class="btn btn-danger btn-sm" onclick="window.adminCancelSubscription('${s.id}')" title="Cancelar"><i class="fa fa-times"></i></button>` : ''}
      </td>
    </tr>
  `).join('');
}

async function loadAdminAds() {
  const sb = getSupabase();
  
  const { data: ads } = await sb
    .from('ads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const tbody = document.getElementById('ads-tbody');
  if (!tbody) return;

  if (!ads || ads.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--gray);">No hay publicidades</td></tr>';
    return;
  }

  tbody.innerHTML = ads.map(a => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:40px;height:40px;border-radius:6px;background:linear-gradient(135deg,rgba(79,70,229,0.2),rgba(6,182,212,0.2));display:flex;align-items:center;justify-content:center;color:var(--accent);">
            <i class="fa fa-bullhorn"></i>
          </div>
          <div>
            <div style="font-weight:600;">${escapeHtml(a.title || '-')}</div>
            <div style="font-size:0.72rem;color:var(--gray);">${escapeHtml(a.description || '').substring(0, 30)}${a.description?.length > 30 ? '...' : ''}</div>
          </div>
        </div>
      </td>
      <td><span class="ad-level-badge ad-level-${a.level || 'nacional'}">${a.level || 'nacional'}</span></td>
      <td>${escapeHtml(a.province || a.city || '—')}</td>
      <td>${a.link ? `<a href="${a.link}" target="_blank" style="color:var(--accent);text-decoration:none;"><i class="fa fa-external-link"></i> Ver</a>` : '—'}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="status-dot ${a.active ? 'active' : ''}"></span>
          <span style="color:${a.active ? 'var(--green)' : 'var(--gray)'};">${a.active ? 'Activa' : 'Inactiva'}</span>
        </div>
      </td>
      <td style="white-space:nowrap;">${new Date(a.created_at).toLocaleDateString('es-AR')}</td>
      <td style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm" onclick="window.adminEditAd('${a.id}')" title="Editar"><i class="fa fa-pencil"></i></button>
        <button class="btn btn-${a.active ? 'danger' : 'success'} btn-sm" onclick="window.adminToggleAd('${a.id}', ${!a.active})" title="${a.active ? 'Desactivar' : 'Activar'}">
          <i class="fa fa-toggle-${a.active ? 'on' : 'off'}"></i>
        </button>
        <button class="btn btn-danger btn-sm" onclick="window.adminDeleteAd('${a.id}')" title="Eliminar"><i class="fa fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

async function loadAdminReviews() {
  const sb = getSupabase();
  
  const { data: reviews } = await sb
    .from('reviews')
    .select('id,user_id,professional_id,rating,comment,is_public,created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const tbody = document.getElementById('reviews-admin-tbody');
  if (!tbody) return;

  if (!reviews || reviews.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray);">No hay reseñas</td></tr>';
    return;
  }

  tbody.innerHTML = reviews.map(r => `
    <tr>
      <td>${escapeHtml(r.profiles?.full_name || '-')}</td>
      <td>${'-'}</td>
      <td><span style="color:var(--orange);font-weight:700;">${r.rating?.toFixed(1) || '-'}</span></td>
      <td>${escapeHtml(r.comment?.substring(0, 50) || '-')}${r.comment?.length > 50 ? '...' : ''}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="window.adminDeleteReview('${r.id}')" title="Eliminar"><i class="fa fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

export function switchAdminTab(tabId) {
  document.querySelectorAll('.admin-tab').forEach(t => {
    if (t) t.style.display = 'none';
  });
  
  const tab = document.getElementById(tabId);
  if (tab) tab.style.display = 'block';

  document.querySelectorAll('.admin-sidebar-item').forEach(i => {
    if (i) {
      const isActive = i.dataset.tab === tabId;
      i.classList.toggle('active', isActive);
    }
  });
}

export async function adminEditUser(userId) {
  const sb = getSupabase();
  const { data: u } = await sb
    .from('profiles')
    .select('id,full_name,role,blocked,blocked_until,cancel_count,warning_count,created_at')
    .eq('id', userId)
    .maybeSingle();

  if (!u) { showToast('Usuario no encontrado', 'error'); return; }

  // Cargar datos en el modal
  document.getElementById('edit-user-id').value        = u.id;
  document.getElementById('edit-user-name').value      = u.full_name || '';
  document.getElementById('edit-user-role').value      = u.role || 'user';
  document.getElementById('edit-user-blocked').checked = u.blocked || false;
  document.getElementById('edit-user-cancel-count').textContent  = u.cancel_count  || 0;
  document.getElementById('edit-user-warning-count').textContent = u.warning_count || 0;
  document.getElementById('edit-user-created').textContent       = u.created_at ? new Date(u.created_at).toLocaleDateString('es-AR') : '-';
  document.getElementById('edit-user-id-display').textContent    = u.id;

  document.getElementById('modal-edit-user').classList.add('open');
}

export async function adminSaveUser() {
  const sb  = getSupabase();
  const uid = document.getElementById('edit-user-id')?.value;
  const full_name = document.getElementById('edit-user-name')?.value?.trim();
  const role      = document.getElementById('edit-user-role')?.value;
  const blocked   = document.getElementById('edit-user-blocked')?.checked;

  if (!full_name) { showToast('El nombre no puede estar vacío', 'warning'); return; }

  const { error } = await sb.rpc('admin_update_user', {
    p_user_id: uid, p_name: full_name, p_role: role, p_blocked: blocked
  });
  if (error) { showToast('Error al guardar: ' + error.message, 'error'); return; }

  showToast('Usuario actualizado', 'success');
  document.getElementById('modal-edit-user')?.classList.remove('open');
  loadAdminData();
}

export async function adminResetCancelCount(userId) {
  const sb = getSupabase();
  await sb.rpc('admin_reset_counters', { p_user_id: userId });
  showToast('Contadores reseteados', 'success');
  adminEditUser(userId);
}

export async function adminUnblockUntil(userId) {
  const sb = getSupabase();
  await sb.rpc('admin_set_blocked', { p_user_id: userId, p_blocked: false });
  showToast('Usuario desbloqueado', 'success');
  adminEditUser(userId);
  loadAdminData();
}

export async function adminToggleBlock(userId, blocked) {
  const sb = getSupabase();

  // Verificar sesión
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { showToast('Sin sesión activa', 'error'); return; }

  // Verificar is_admin
  const { data: isAdm, error: admErr } = await sb.rpc('is_admin');
  if (admErr || !isAdm) {
    showToast('Tu sesión no tiene permisos de admin. Cerrá sesión y volvé a entrar.', 'error');
    return;
  }

  const { error } = await sb.from('profiles').update({ blocked }).eq('id', userId);

  if (error) {
    showToast('Error: ' + error.message + ' (code: ' + error.code + ')', 'error');
    return;
  }

  showToast(blocked ? 'Usuario bloqueado' : 'Usuario desbloqueado', 'success');
  loadAdminUsers();
}

export async function adminToggleFeatured(proId, featured) {
  const sb = getSupabase();
  const { error } = await sb.rpc('admin_set_featured', { p_pro_id: proId, p_featured: featured });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast(featured ? 'Profesional destacado' : 'Destacado removido', 'success');
  loadAdminPros();
}

export async function adminBlockPro(userId) {
  const sb = getSupabase();
  const { error } = await sb.rpc('admin_set_blocked', { p_user_id: userId, p_blocked: true });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Profesional bloqueado', 'success');
  loadAdminPros();
}

export async function adminViewPro(proId) {
  const sb = getSupabase();
  const { data: p } = await sb
    .from('professionals')
    .select('*,profiles:user_id(full_name,avatar_url,blocked,cancel_count)')
    .eq('id', proId)
    .maybeSingle();
  if (!p) { showToast('Profesional no encontrado', 'error'); return; }

  const el = document.getElementById('view-pro-body');
  if (!el) return;

  const trustColor = (p.trust_score||100) >= 80 ? 'var(--green)' : (p.trust_score||100) >= 50 ? 'var(--orange)' : '#f87171';
  const scoreColor = (p.ranking_score||100) >= 80 ? 'var(--green)' : (p.ranking_score||100) >= 50 ? 'var(--orange)' : '#f87171';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
      <div class="chat-conv-avatar" style="width:52px;height:52px;font-size:1.2rem;flex-shrink:0;">
        ${p.profiles?.full_name?.charAt(0) || 'P'}
      </div>
      <div>
        <div style="font-weight:700;font-size:1.05rem;">${escapeHtml(p.profiles?.full_name || '—')}</div>
        <div style="font-size:0.82rem;color:var(--gray);">${escapeHtml(p.specialty || '—')} · ${escapeHtml(p.city || '—')}, ${escapeHtml(p.province || '—')}</div>
        <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;">
          ${p.is_featured ? '<span class="badge badge-destacado">Destacado</span>' : ''}
          ${p.is_certified ? '<span class="badge badge-certificado">Certificado</span>' : ''}
          ${p.suspended ? '<span class="badge badge-destacado">Suspendido</span>' : '<span class="badge badge-disponible">Activo</span>'}
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;">
      <div class="pro-stat-item"><span class="pro-stat-num" style="color:${scoreColor}">${p.ranking_score||100}</span><span class="pro-stat-label">Score</span></div>
      <div class="pro-stat-item"><span class="pro-stat-num" style="color:${trustColor}">${p.trust_score||100}%</span><span class="pro-stat-label">Confianza</span></div>
      <div class="pro-stat-item"><span class="pro-stat-num">${p.avg_rating ? p.avg_rating.toFixed(1)+'★' : '—'}</span><span class="pro-stat-label">Rating</span></div>
      <div class="pro-stat-item"><span class="pro-stat-num" style="color:var(--green)">${p.completed_jobs||0}</span><span class="pro-stat-label">Completados</span></div>
      <div class="pro-stat-item"><span class="pro-stat-num" style="color:#f87171">${p.cancel_count||0}</span><span class="pro-stat-label">Cancelaciones</span></div>
      <div class="pro-stat-item"><span class="pro-stat-num" style="color:var(--orange)">${p.report_count||0}</span><span class="pro-stat-label">Reportes</span></div>
    </div>

    <div style="font-size:0.82rem;color:var(--gray);display:flex;flex-direction:column;gap:6px;margin-bottom:18px;">
      <div>📞 ${escapeHtml(p.whatsapp || p.phone || '—')}</div>
      <div>📍 ${escapeHtml(p.address || '—')}</div>
      <div>💰 $${p.hourly_rate || '—'}/hr · ${p.years_experience || 0} años de exp.</div>
      ${p.suspension_reason ? `<div style="color:var(--orange);">⚠️ Motivo suspensión: ${escapeHtml(p.suspension_reason)}</div>` : ''}
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-${p.is_featured ? 'danger' : 'accent'} btn-sm" onclick="window.adminToggleFeatured('${p.id}',${!p.is_featured});document.getElementById('modal-view-pro').classList.remove('open');">
        <i class="fa fa-crown"></i> ${p.is_featured ? 'Quitar destacado' : 'Destacar'}
      </button>
      ${p.suspended
        ? `<button class="btn btn-success btn-sm" onclick="window.adminUnsuspend('${p.id}');document.getElementById('modal-view-pro').classList.remove('open');"><i class="fa fa-unlock"></i> Levantar suspensión</button>`
        : `<button class="btn btn-danger btn-sm" onclick="document.getElementById('modal-view-pro').classList.remove('open');window.adminSuspendModal('${p.id}','${escapeHtml(p.profiles?.full_name||'')}');"><i class="fa fa-ban"></i> Suspender</button>`}
      <button class="btn btn-ghost btn-sm" onclick="window.adminOpenPenaltyModal('${p.id}','${escapeHtml(p.profiles?.full_name||'')}');document.getElementById('modal-view-pro').classList.remove('open');">
        <i class="fa fa-gavel"></i> Penalizar
      </button>
      <button class="btn btn-ghost btn-sm" onclick="window.adminViewPenalties('${p.id}');document.getElementById('modal-view-pro').classList.remove('open');">
        <i class="fa fa-clock-rotate-left"></i> Historial
      </button>
    </div>
  `;
  document.getElementById('modal-view-pro').classList.add('open');
}

export async function adminViewJob(jobId) {
  const sb = getSupabase();
  const { data: j } = await sb
    .from('jobs')
    .select('*,profiles:user_id(full_name)')
    .eq('id', jobId)
    .maybeSingle();
  if (!j) { showToast('Trabajo no encontrado', 'error'); return; }

  const el = document.getElementById('view-job-body');
  if (!el) return;

  const statusLabels = {
    solicitado:'📋 Solicitado', aceptado:'✅ Aceptado', en_proceso:'🔧 En proceso',
    pendiente_confirmacion:'⏳ Pendiente confirmación', finalizado:'🏁 Finalizado',
    cancelado:'❌ Cancelado', rechazado:'🚫 Rechazado', en_disputa:'⚖️ En disputa',
    fecha_propuesta_pro:'📅 Fecha propuesta'
  };

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="job-status status-${j.status}">${statusLabels[j.status]||j.status}</span>
        <span style="font-size:0.75rem;color:var(--gray);">${j.id.slice(0,8)}…</span>
      </div>

      <div style="background:rgba(255,255,255,0.04);border-radius:var(--radius-sm);padding:12px;font-size:0.83rem;display:flex;flex-direction:column;gap:6px;">
        <div><strong>Cliente:</strong> ${escapeHtml(j.profiles?.full_name || '—')}</div>
        <div><strong>Especialidad:</strong> ${escapeHtml(j.specialty || '—')}</div>
        <div><strong>Dirección:</strong> ${escapeHtml(j.address || '—')}</div>
        <div><strong>Descripción:</strong> ${escapeHtml(j.description || '—')}</div>
        ${j.scheduled_date ? `<div><strong>Fecha:</strong> ${j.scheduled_date} ${j.scheduled_time||''}</div>` : ''}
        ${j.is_urgent ? '<div style="color:var(--orange);"><i class="fa fa-bolt"></i> Urgente</div>' : ''}
        ${j.cancellation_reason ? `<div style="color:#f87171;"><strong>Motivo cancelación:</strong> ${escapeHtml(j.cancellation_reason)}</div>` : ''}
        ${j.dispute_desc ? `<div style="color:var(--orange);"><strong>Disputa:</strong> ${escapeHtml(j.dispute_desc)}</div>` : ''}
        ${j.warranty_until ? `<div style="color:var(--green);"><i class="fa fa-shield-halved"></i> Garantía hasta: ${new Date(j.warranty_until).toLocaleDateString('es-AR')}</div>` : ''}
        <div style="color:var(--gray);font-size:0.75rem;">Creado: ${j.created_at ? new Date(j.created_at).toLocaleString('es-AR') : '—'}</div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${j.status !== 'finalizado' && j.status !== 'cancelado' ? `
          <button class="btn btn-danger btn-sm" onclick="window.adminCancelJob('${j.id}');document.getElementById('modal-view-job').classList.remove('open');">
            <i class="fa fa-times"></i> Cancelar trabajo
          </button>` : ''}
        ${j.status === 'en_disputa' ? `
          <button class="btn btn-success btn-sm" onclick="window.adminResolveDispute('${j.id}');document.getElementById('modal-view-job').classList.remove('open');">
            <i class="fa fa-gavel"></i> Resolver disputa
          </button>` : ''}
      </div>
    </div>
  `;
  document.getElementById('modal-view-job').classList.add('open');
}

export async function adminResolveDispute(jobId) {
  if (!confirm('¿Marcar esta disputa como resuelta?')) return;
  const sb = getSupabase();
  await sb.from('jobs').update({ status: 'finalizado', completed_at: new Date().toISOString() }).eq('id', jobId);
  showToast('Disputa resuelta — trabajo marcado como finalizado', 'success');
  loadAdminJobs();
}

export async function adminCancelJob(jobId) {
  if (!confirm('¿Estás seguro de cancelar este trabajo?')) return;
  
  const sb = getSupabase();
  const { error } = await sb.rpc('admin_cancel_job', { p_job_id: jobId });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Trabajo cancelado', 'success');
  loadAdminJobs();
}

export async function adminCancelSubscription(subId) {
  if (!confirm('¿Estás seguro de cancelar esta suscripción?')) return;
  
  const sb = getSupabase();
  const { error } = await sb.rpc('admin_cancel_subscription', { p_sub_id: subId });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Suscripción cancelada', 'success');
  loadAdminSubscriptions();
}

export async function adminToggleAd(adId, active) {
  const sb = getSupabase();
  const { error } = await sb.rpc('admin_toggle_ad', { p_ad_id: adId, p_active: active });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast(active ? 'Publicidad activada' : 'Publicidad desactivada', 'success');
  loadAdminAds();
}

export async function adminDeleteAd(adId) {
  if (!confirm('¿Estás seguro de eliminar esta publicidad?')) return;
  
  const sb = getSupabase();
  const { error } = await sb.rpc('admin_delete_ad', { p_ad_id: adId });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Publicidad eliminada', 'success');
  loadAdminAds();
}

export async function adminDeleteReview(reviewId) {
  if (!confirm('¿Estás seguro de eliminar esta reseña?')) return;
  
  const sb = getSupabase();
  const { error } = await sb.rpc('admin_delete_review', { p_review_id: reviewId });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Reseña eliminada', 'success');
  loadAdminReviews();
}

export async function adminViewAuditLog() {
  const sb = getSupabase();
  const { data: logs } = await sb
    .from('audit_log')
    .select('id,action,table_name,created_at,profiles:user_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  const el = document.getElementById('audit-log-body');
  if (!el) return;

  if (!logs?.length) {
    el.innerHTML = '<p style="color:var(--gray);text-align:center;padding:20px;">Sin registros de auditoría</p>';
  } else {
    el.innerHTML = logs.map(l => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid var(--border);font-size:0.8rem;">
        <div>
          <span style="color:var(--accent);font-weight:600;">${escapeHtml(l.action||'—')}</span>
          <span style="color:var(--gray);margin:0 6px;">en</span>
          <span style="color:var(--light);">${escapeHtml(l.table_name||'—')}</span>
          <span style="color:var(--gray);margin-left:8px;">por ${escapeHtml(l.profiles?.full_name||'Sistema')}</span>
        </div>
        <span style="color:var(--gray);font-size:0.72rem;">${new Date(l.created_at).toLocaleString('es-AR')}</span>
      </div>`).join('');
  }
  document.getElementById('modal-audit-log').classList.add('open');
}

export function filterAdminTable(query, tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.adminEditUser         = adminEditUser;
window.adminViewPro           = adminViewPro;
window.adminViewJob           = adminViewJob;
window.adminResolveDispute    = adminResolveDispute;
window.adminViewAuditLog      = adminViewAuditLog;
window.adminSaveUser          = adminSaveUser;
window.adminResetCancelCount  = adminResetCancelCount;
window.adminUnblockUntil      = adminUnblockUntil;
window.adminToggleBlock = adminToggleBlock;
window.adminToggleFeatured = adminToggleFeatured;
window.adminBlockPro = adminBlockPro;
window.adminCancelJob = adminCancelJob;
window.adminCancelSubscription = adminCancelSubscription;
window.adminToggleAd = adminToggleAd;
window.adminDeleteAd = adminDeleteAd;
window.adminDeleteReview = adminDeleteReview;

// ══════════════════════════════════════════════════════════════════════════════
// SISTEMA DE PENALIZACIONES — funciones admin
// ══════════════════════════════════════════════════════════════════════════════
import {
  applyPenalty, revertPenalty, suspendPro, unsuspendPro,
  setUrgentBlock, blockUserTemp, loadPenalties, loadReports, reviewReport,
  PENALTY_WEIGHTS
} from './penalties.js';

// ─── Cargar panel de penalizaciones ───────────────────────────────────────────
export async function loadAdminPenalties() {
  await Promise.all([
    loadPenaltiesList(),
    loadReportsList('pending'),
    loadPenalizedPros(),
  ]);
}

async function loadPenaltiesList() {
  const sb = getSupabase();
  const { data } = await sb
    .from('penalties')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(80);

  const tbody = document.getElementById('penalties-tbody');
  if (!tbody) return;
  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="adm-empty">Sin penalizaciones registradas</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => {
    const typeLabel = {
      cancel: 'Cancelación', no_response: 'Sin respuesta', bad_review: 'Mala reseña',
      report: 'Reporte', warning: 'Advertencia', suspension: 'Suspensión',
    }[p.type] || p.type;
    const deltaHtml = p.delta < 0
      ? `<span class="penalty-delta neg">${p.delta}</span>`
      : `<span class="penalty-delta">—</span>`;
    const statusHtml = p.reverted
      ? '<span class="badge badge-disponible">Revertida</span>'
      : '<span class="badge badge-destacado">Activa</span>';
    return `<tr>
      <td style="font-size:0.76rem;color:var(--gray2);">${p.id.slice(0,8)}…</td>
      <td><span class="penalty-type-badge type-${p.type}">${typeLabel}</span></td>
      <td style="font-size:0.82rem;">${escapeHtml(p.description || '—')}</td>
      <td>${deltaHtml}</td>
      <td>${statusHtml}</td>
      <td>
        ${!p.reverted ? `<button class="btn btn-ghost btn-sm" onclick="window.adminRevertPenalty('${p.id}')" title="Revertir"><i class="fa fa-rotate-left"></i></button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

async function loadReportsList(status) {
  const sb = getSupabase();
  let q = sb.from('reports')
    .select('id,reason,description,status,created_at,professional_id,reporter_id')
    .order('created_at', { ascending: false }).limit(80);
  if (status !== 'all') q = q.eq('status', status);
  const { data } = await q;

  const tbody = document.getElementById('reports-tbody');
  if (!tbody) return;
  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="adm-empty">Sin reportes</td></tr>';
    return;
  }
  const reasonLabel = {
    estafa: '🚨 Estafa', mal_trato: '😠 Mal trato',
    trabajo_incompleto: '🔧 Trabajo incompleto',
    no_se_presento: '👻 No se presentó', otro: '📋 Otro'
  };
  tbody.innerHTML = data.map(r => `
    <tr>
      <td style="font-size:0.76rem;color:var(--gray2);">${r.id.slice(0,8)}…</td>
      <td>${reasonLabel[r.reason] || r.reason}</td>
      <td style="font-size:0.82rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(r.description || '—')}</td>
      <td style="font-size:0.76rem;color:var(--gray);">${new Date(r.created_at).toLocaleDateString('es-AR')}</td>
      <td><span class="badge badge-${r.status==='pending'?'nuevo':r.status==='confirmed'?'destacado':'disponible'}">${r.status}</span></td>
      <td style="display:flex;gap:4px;">
        ${r.status === 'pending' ? `
          <button class="btn btn-success btn-sm" onclick="window.adminConfirmReport('${r.id}','${r.professional_id}')" title="Confirmar"><i class="fa fa-check"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="window.adminDismissReport('${r.id}')" title="Desestimar"><i class="fa fa-xmark"></i></button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

async function loadPenalizedPros() {
  const sb = getSupabase();
  const { data } = await sb
    .from('professionals')
    .select('id,user_id,specialty,ranking_score,trust_score,cancel_count,report_count,warning_count,suspended,urgent_blocked,profiles:user_id(full_name)')
    .or('ranking_score.lt.80,suspended.eq.true,report_count.gt.0,cancel_count.gt.0')
    .order('ranking_score', { ascending: true })
    .limit(60);

  const tbody = document.getElementById('penalized-pros-tbody');
  if (!tbody) return;
  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="adm-empty">Sin profesionales penalizados</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => {
    const scoreColor = p.ranking_score >= 80 ? 'var(--green)' : p.ranking_score >= 50 ? 'var(--orange)' : '#f87171';
    const statusBadge = p.suspended
      ? '<span class="badge badge-destacado">Suspendido</span>'
      : '<span class="badge badge-disponible">Activo</span>';
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="chat-conv-avatar" style="width:30px;height:30px;font-size:0.72rem;">${p.profiles?.full_name?.charAt(0)||'P'}</div>
          ${escapeHtml(p.profiles?.full_name || '—')}
        </div>
      </td>
      <td>${escapeHtml(p.specialty||'—')}</td>
      <td><span style="font-weight:700;color:${scoreColor};">${p.ranking_score}</span></td>
      <td>
        <span title="Cancelaciones" style="margin-right:6px;">❌ ${p.cancel_count||0}</span>
        <span title="Reportes" style="margin-right:6px;">🚨 ${p.report_count||0}</span>
        <span title="Advertencias">⚠️ ${p.warning_count||0}</span>
      </td>
      <td>${statusBadge}</td>
      <td>${p.urgent_blocked ? '<span style="color:#f87171;font-size:0.78rem;">Bloqueado</span>' : '<span style="color:var(--green);font-size:0.78rem;">OK</span>'}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" onclick="window.adminOpenPenaltyModal('${p.id}','${escapeHtml(p.profiles?.full_name||'')}')" title="Penalizar"><i class="fa fa-gavel"></i></button>
        ${p.suspended
          ? `<button class="btn btn-success btn-sm" onclick="window.adminUnsuspend('${p.id}')" title="Levantar suspensión"><i class="fa fa-unlock"></i></button>`
          : `<button class="btn btn-danger btn-sm" onclick="window.adminSuspendModal('${p.id}','${escapeHtml(p.profiles?.full_name||'')}')" title="Suspender"><i class="fa fa-ban"></i></button>`}
        <button class="btn btn-${p.urgent_blocked?'success':'orange'} btn-sm" onclick="window.adminToggleUrgent('${p.id}',${!p.urgent_blocked})" title="${p.urgent_blocked?'Habilitar urgentes':'Bloquear urgentes'}"><i class="fa fa-bolt"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="window.adminViewPenalties('${p.id}')" title="Ver historial"><i class="fa fa-clock-rotate-left"></i></button>
      </td>
    </tr>`;
  }).join('');
}

// ─── Acciones admin penalizaciones ────────────────────────────────────────────
export async function adminRevertPenalty(penaltyId) {
  if (!confirm('¿Revertir esta penalización?')) return;
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  try {
    await revertPenalty(penaltyId, user.id);
    showToast('Penalización revertida', 'success');
    loadAdminPenalties();
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

export async function adminConfirmReport(reportId, proId) {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  await reviewReport(reportId, 'confirmed', user.id);
  // Aplicar penalización al pro
  await applyPenalty({
    targetId: proId, targetType: 'professional',
    type: 'report', description: 'Reporte de usuario confirmado por admin',
    delta: PENALTY_WEIGHTS.report, adminId: user.id,
  });
  showToast('Reporte confirmado — penalización aplicada', 'success');
  loadAdminPenalties();
}

export async function adminDismissReport(reportId) {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  await reviewReport(reportId, 'dismissed', user.id);
  showToast('Reporte desestimado', 'info');
  loadReportsList('pending');
}

export async function adminOpenPenaltyModal(proId, name) {
  document.getElementById('penalty-modal-pro-id').value = proId;
  document.getElementById('penalty-modal-title').textContent = `Penalizar a ${name}`;
  document.getElementById('modal-penalty').classList.add('open');
}

export async function adminSubmitPenalty() {
  const sb = getSupabase();
  const proId = document.getElementById('penalty-modal-pro-id')?.value;
  const type  = document.getElementById('penalty-modal-type')?.value;
  const desc  = document.getElementById('penalty-modal-desc')?.value?.trim();
  if (!type || !desc) { showToast('Completá tipo y descripción', 'warning'); return; }
  const { data: { user } } = await sb.auth.getUser();
  try {
    await applyPenalty({
      targetId: proId, targetType: 'professional',
      type, description: desc,
      delta: PENALTY_WEIGHTS[type] ?? 0,
      adminId: user.id,
    });
    showToast('Penalización aplicada', 'success');
    document.getElementById('modal-penalty')?.classList.remove('open');
    loadAdminPenalties();
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

export async function adminSuspendModal(proId, name) {
  document.getElementById('suspend-modal-pro-id').value = proId;
  document.getElementById('suspend-modal-title').textContent = `Suspender a ${name}`;
  document.getElementById('modal-suspend').classList.add('open');
}

export async function adminSubmitSuspend() {
  const sb = getSupabase();
  const proId  = document.getElementById('suspend-modal-pro-id')?.value;
  const reason = document.getElementById('suspend-modal-reason')?.value?.trim();
  const days   = parseInt(document.getElementById('suspend-modal-days')?.value) || 7;
  if (!reason) { showToast('Ingresá el motivo', 'warning'); return; }
  const { data: { user } } = await sb.auth.getUser();
  try {
    const { error: suspErr } = await sb.rpc('admin_suspend_pro', {
      p_pro_id: proId, p_reason: reason, p_days: days
    });
    if (suspErr) throw suspErr;
    showToast(`Profesional suspendido por ${days} días`, 'success');
    document.getElementById('modal-suspend')?.classList.remove('open');
    loadAdminPenalties();
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

export async function adminUnsuspend(proId) {
  if (!confirm('¿Levantar la suspensión?')) return;
  const sb = getSupabase();
  await sb.rpc('admin_unsuspend_pro', { p_pro_id: proId });
  showToast('Suspensión levantada', 'success');
  loadAdminPenalties();
}

export async function adminToggleUrgent(proId, blocked) {
  await setUrgentBlock(proId, blocked);
  showToast(blocked ? 'Trabajos urgentes bloqueados' : 'Trabajos urgentes habilitados', 'success');
  loadPenalizedPros();
}

export async function adminViewPenalties(proId) {
  const penalties = await loadPenalties(proId);
  const list = document.getElementById('penalty-history-list');
  if (!list) return;
  list.innerHTML = penalties.length
    ? penalties.map(p => `
        <div class="penalty-history-item ${p.reverted ? 'reverted' : ''}">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="penalty-type-badge type-${p.type}">${p.type}</span>
            <span style="font-size:0.82rem;">${escapeHtml(p.description||'')}</span>
            ${p.delta ? `<span class="penalty-delta neg">${p.delta}</span>` : ''}
          </div>
          <div style="font-size:0.72rem;color:var(--gray);margin-top:3px;">
            ${new Date(p.created_at).toLocaleString('es-AR')}
            ${p.reverted ? ' · <span style="color:var(--green)">Revertida</span>' : ''}
            ${!p.reverted ? `<button class="btn btn-ghost btn-sm" style="padding:2px 8px;margin-left:8px;" onclick="window.adminRevertPenalty('${p.id}')">Revertir</button>` : ''}
          </div>
        </div>`).join('')
    : '<p style="color:var(--gray);font-size:0.85rem;">Sin penalizaciones</p>';
  document.getElementById('modal-penalty-history')?.classList.add('open');
}

export async function adminFilterReports(status) {
  document.querySelectorAll('.report-filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-status="${status}"]`)?.classList.add('active');
  await loadReportsList(status);
}

window.adminRevertPenalty   = adminRevertPenalty;
window.adminConfirmReport   = adminConfirmReport;
window.adminDismissReport   = adminDismissReport;
window.adminOpenPenaltyModal= adminOpenPenaltyModal;
window.adminSubmitPenalty   = adminSubmitPenalty;
window.adminSuspendModal    = adminSuspendModal;
window.adminSubmitSuspend   = adminSubmitSuspend;
window.adminUnsuspend       = adminUnsuspend;
window.adminToggleUrgent    = adminToggleUrgent;
window.adminViewPenalties   = adminViewPenalties;
window.adminFilterReports   = adminFilterReports;

// ══════════════════════════════════════════════════════════════════════════════
// PANEL DE SEGURIDAD
// ══════════════════════════════════════════════════════════════════════════════
export async function loadAdminSecurity() {
  await Promise.all([
    loadSuspiciousAccounts(),
    loadHighCancelUsers(),
    loadHighReportPros(),
  ]);
}

async function loadSuspiciousAccounts() {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('profiles')
    .select('id,full_name,created_at')
    .eq('suspicious_flag', true)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    const tbody = document.getElementById('suspicious-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="adm-empty" style="color:var(--orange);">Ejecutá security_migration.sql para activar esta función</td></tr>';
    return;
  }

  const tbody = document.getElementById('suspicious-tbody');
  if (!tbody) return;
  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="adm-empty">Sin cuentas sospechosas</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(u => `
    <tr>
      <td>${escapeHtml(u.full_name || '—')}</td>
      <td style="font-size:0.78rem;color:var(--orange);">${escapeHtml(u.suspicious_reason || '—')}</td>
      <td style="font-size:0.76rem;color:var(--gray);">${new Date(u.created_at).toLocaleDateString('es-AR')}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="window.adminToggleBlock('${u.id}', true)" title="Bloquear"><i class="fa fa-ban"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="window.adminClearSuspicious('${u.id}')" title="Limpiar flag"><i class="fa fa-check"></i></button>
      </td>
    </tr>`).join('');
}

async function loadHighCancelUsers() {
  const sb = getSupabase();
  const { data, error: e2 } = await sb
    .from('profiles')
    .select('id,full_name')
    .gt('cancel_count', 2)
    .order('cancel_count', { ascending: false })
    .limit(50);

  const tbody = document.getElementById('cancel-users-tbody');
  if (!tbody) return;
  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="adm-empty">Sin usuarios con cancelaciones excesivas</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(u => `
    <tr>
      <td>${escapeHtml(u.full_name || '—')}</td>
      <td><span style="font-weight:700;color:#f87171;">${u.cancel_count}</span></td>
      <td><span class="badge badge-${u.blocked ? 'destacado' : 'disponible'}">${u.blocked ? 'Bloqueado' : 'Activo'}</span></td>
      <td>
        <button class="btn btn-${u.blocked ? 'success' : 'danger'} btn-sm" onclick="window.adminToggleBlock('${u.id}', ${!u.blocked})">
          <i class="fa fa-${u.blocked ? 'unlock' : 'ban'}"></i>
        </button>
      </td>
    </tr>`).join('');
}

async function loadHighReportPros() {
  const sb = getSupabase();
  const { data } = await sb
    .from('professionals')
    .select('id,user_id,specialty,report_count,cancel_count,ranking_score,suspended,profiles:user_id(full_name)')
    .gt('report_count', 0)
    .order('report_count', { ascending: false })
    .limit(50);

  const tbody = document.getElementById('report-pros-tbody');
  if (!tbody) return;
  if (!data?.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="adm-empty">Sin profesionales con reportes</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${escapeHtml(p.profiles?.full_name || '—')}</td>
      <td>${escapeHtml(p.specialty || '—')}</td>
      <td><span style="font-weight:700;color:#f87171;">${p.report_count}</span></td>
      <td><span style="font-weight:700;color:${p.ranking_score<50?'#f87171':p.ranking_score<80?'var(--orange)':'var(--green)'};">${p.ranking_score}</span></td>
      <td><span class="badge badge-${p.suspended ? 'destacado' : 'disponible'}">${p.suspended ? 'Suspendido' : 'Activo'}</span></td>
      <td style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm" onclick="window.adminOpenPenaltyModal('${p.id}','${escapeHtml(p.profiles?.full_name||'')}')" title="Penalizar"><i class="fa fa-gavel"></i></button>
        ${p.suspended
          ? `<button class="btn btn-success btn-sm" onclick="window.adminUnsuspend('${p.id}')"><i class="fa fa-unlock"></i></button>`
          : `<button class="btn btn-danger btn-sm" onclick="window.adminSuspendModal('${p.id}','${escapeHtml(p.profiles?.full_name||'')}')"><i class="fa fa-ban"></i></button>`}
      </td>
    </tr>`).join('');
}

export async function adminClearSuspicious(userId) {
  const sb = getSupabase();
  await sb.rpc('admin_clear_suspicious', { p_user_id: userId });
  showToast('Flag de sospechoso eliminado', 'success');
  loadSuspiciousAccounts();
}

window.adminClearSuspicious = adminClearSuspicious;
window.loadAdminSecurity    = loadAdminSecurity;

export function adminNewAd() {
  // Limpiar form
  document.getElementById('ad-form-id').value        = '';
  document.getElementById('ad-form-title').value     = '';
  document.getElementById('ad-form-desc').value      = '';
  document.getElementById('ad-form-link').value      = '';
  document.getElementById('ad-form-level').value     = 'local';
  document.getElementById('ad-form-province').value  = '';
  document.getElementById('ad-form-city').value      = '';
  document.getElementById('ad-form-active').checked  = true;
  document.getElementById('ad-form-image').value     = '';
  document.getElementById('ad-form-image-file').value = '';
  document.getElementById('ad-form-image-preview-url').style.display = 'none';
  document.getElementById('ad-image-url-input').style.display = 'none';
  document.getElementById('ad-image-url-input').value = '';
  document.getElementById('ad-image-editor').style.display = 'none';
  document.getElementById('ad-image-upload-area').style.display = 'block';
  document.getElementById('ad-image-status').innerHTML = '<i class="fa fa-times"></i> Sin imagen';
  
  // Resetear estado de imagen
  adImageState = { file: null, zoom: 1, posX: 0, posY: 0, uploadedUrl: null, isFromUrl: false };
  
  document.getElementById('ad-form-modal-title').textContent = 'Nueva publicidad';
  document.getElementById('modal-ad-form').classList.add('open');
}

export async function adminEditAd(adId) {
  const sb = getSupabase();
  const { data: a } = await sb.from('ads').select('*').eq('id', adId).maybeSingle();
  if (!a) return;
  document.getElementById('ad-form-id').value        = a.id;
  document.getElementById('ad-form-title').value     = a.title     || '';
  document.getElementById('ad-form-desc').value      = a.description || '';
  document.getElementById('ad-form-link').value      = a.link      || '';
  document.getElementById('ad-form-level').value     = a.level     || 'local';
  document.getElementById('ad-form-province').value  = a.province  || '';
  document.getElementById('ad-form-city').value      = a.city      || '';
  document.getElementById('ad-form-active').checked  = a.active    ?? true;
  document.getElementById('ad-form-image').value     = a.image_url  || '';
  
  // Cargar transformación de imagen guardada
  let savedTransform = { zoom: 1, posX: 0, posY: 0 };
  try {
    if (a.image_transform) {
      if (typeof a.image_transform === 'string') {
        savedTransform = JSON.parse(a.image_transform);
      } else {
        savedTransform = { 
          zoom: a.image_transform.zoom || 1, 
          posX: a.image_transform.posX || 0, 
          posY: a.image_transform.posY || 0 
        };
      }
    } else if (a.image_zoom) {
      savedTransform = { zoom: a.image_zoom || 1, posX: a.image_posX || 0, posY: a.image_posY || 0 };
    }
  } catch(e) {}
  document.getElementById('ad-form-image-transform').value = JSON.stringify(savedTransform);
  
  // Resetear estado de imagen
  adImageState = { 
    file: null, 
    zoom: savedTransform.zoom, 
    posX: savedTransform.posX, 
    posY: savedTransform.posY, 
    uploadedUrl: a.image_url || null, 
    isFromUrl: !!a.image_url 
  };
  
  if (a.image_url) {
    // Mostrar editor con la imagen existente
    document.getElementById('ad-image-upload-area').style.display = 'none';
    document.getElementById('ad-image-editor').style.display = 'block';
    document.getElementById('ad-form-image-preview-url').style.display = 'none';
    document.getElementById('ad-image-preview-img').src = a.image_url;
    adImageUpdatePreview();
  } else {
    document.getElementById('ad-image-editor').style.display = 'none';
    document.getElementById('ad-image-upload-area').style.display = 'block';
    document.getElementById('ad-form-image-preview-url').style.display = 'none';
  }
  
  document.getElementById('ad-form-modal-title').textContent = 'Editar publicidad';
  document.getElementById('modal-ad-form').classList.add('open');
}

export async function adminSaveAd() {
  const sb = getSupabase();
  const id       = document.getElementById('ad-form-id')?.value?.trim();
  const title    = document.getElementById('ad-form-title')?.value?.trim();
  const desc     = document.getElementById('ad-form-desc')?.value?.trim();
  const link     = document.getElementById('ad-form-link')?.value?.trim();
  const level    = document.getElementById('ad-form-level')?.value || 'local';
  const province = document.getElementById('ad-form-province')?.value?.trim();
  const city     = document.getElementById('ad-form-city')?.value?.trim();
  const active   = document.getElementById('ad-form-active')?.checked ?? true;
  
  // Obtener transformación de imagen
  const transformStr = document.getElementById('ad-form-image-transform')?.value || '{}';
  let imageTransform = { zoom: 1, posX: 0, posY: 0 };
  try {
    imageTransform = JSON.parse(transformStr);
  } catch(e) {}
  
  if (!title) { showToast('El título es obligatorio', 'warning'); return; }

  // Subir imagen a Supabase si es un archivo
  let image_url = document.getElementById('ad-form-image')?.value?.trim() || null;
  if (!image_url && adImageState.file) {
    showToast('Subiendo imagen...', 'info');
    const { uploadAdImage } = await import('./upload.js');
    image_url = await uploadAdImage(adImageState.file);
    if (!image_url) {
      showToast('Error al subir imagen. Podés usar una URL externa.', 'error');
      return;
    }
  }
  
  // Rechazar base64 - no guardar en la base de datos
  if (image_url && image_url.startsWith('data:')) {
    image_url = null;
  }
  
  try {
    const { data: { user } } = await sb.auth.getUser();
    
    // Guardar transformación como JSON solo si hay valores custom
    const hasCustomTransform = imageTransform.zoom !== 1 || imageTransform.posX !== 0 || imageTransform.posY !== 0;
    const imageTransformData = hasCustomTransform ? JSON.stringify({
      zoom: imageTransform.zoom || 1,
      posX: imageTransform.posX || 0,
      posY: imageTransform.posY || 0
    }) : null;
    
    let error;
    if (id) {
      // Actualizar directamente
      const updateData = {
        title: title,
        description: desc || null,
        link: link || null,
        level: level,
        province: province || null,
        city: city || null,
        active: active,
        image_url: image_url || null
      };
      if (imageTransformData) {
        updateData.image_transform = imageTransformData;
      }
      const { error: updateError } = await sb.from('ads').update(updateData).eq('id', id);
      error = updateError;
    } else {
      // Insertar directamente
      const insertData = {
        title: title,
        description: desc || null,
        link: link || null,
        level: level,
        province: province || null,
        city: city || null,
        active: active,
        image_url: image_url || null,
        created_by: user.id
      };
      if (imageTransformData) {
        insertData.image_transform = imageTransformData;
      }
      const { error: insertError } = await sb.from('ads').insert(insertData);
      error = insertError;
    }

    if (error) {
      console.error('adminSaveAd error:', error);
      showToast('Error: ' + error.message, 'error');
      return;
    }

    showToast(id ? 'Publicidad actualizada' : 'Publicidad creada', 'success');
    document.getElementById('modal-ad-form')?.classList.remove('open');
    loadAdminAds();
  } catch(e) {
    console.error('adminSaveAd exception:', e);
    showToast('Error inesperado: ' + e.message, 'error');
  }
}

window.adminNewAd  = adminNewAd;
window.adminEditAd = adminEditAd;
window.adminSaveAd = adminSaveAd;

function adminPreviewImageUrl() {
  const url = document.getElementById('ad-form-image')?.value?.trim();
  const thumb = document.getElementById('ad-form-image-thumb');
  const prev  = document.getElementById('ad-form-image-preview');
  if (url && !url.startsWith('data:') && thumb && prev) {
    thumb.src = url;
    prev.style.display = 'block';
  } else if (prev) {
    prev.style.display = 'none';
  }
}
window.adminPreviewImageUrl = adminPreviewImageUrl;

let adImageState = {
  file: null,
  zoom: 1,
  posX: 0,
  posY: 0,
  uploadedUrl: null,
  isFromUrl: false
};

function adImageFileSelected(input) {
  const file = input.files[0];
  if (!file) return;
  
  if (file.size > 5 * 1024 * 1024) {
    showToast('La imagen debe ser menor a 5MB', 'warning');
    return;
  }
  
  adImageState = {
    file: file,
    zoom: 1,
    posX: 0,
    posY: 0,
    uploadedUrl: null,
    isFromUrl: false
  };
  
  document.getElementById('ad-image-upload-area').style.display = 'none';
  document.getElementById('ad-image-editor').style.display = 'block';
  
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('ad-image-preview-img').src = e.target.result;
    adImageUpdatePreview();
  };
  reader.readAsDataURL(file);
}

function adImageUpdatePreview() {
  const img = document.getElementById('ad-image-preview-img');
  const container = document.getElementById('ad-image-preview-container');
  if (!img || !container) return;
  
  const containerW = container.offsetWidth;
  const containerH = container.offsetHeight;
  
  img.style.width = (containerW * adImageState.zoom) + 'px';
  img.style.left = (containerW / 2 - (containerW * adImageState.zoom) / 2 + adImageState.posX) + 'px';
  img.style.top = (containerH / 2 - (containerH * adImageState.zoom) / 2 + adImageState.posY) + 'px';
  
  document.getElementById('ad-form-image-transform').value = JSON.stringify({
    zoom: adImageState.zoom,
    posX: adImageState.posX,
    posY: adImageState.posY
  });
}

function adImageZoomIn() {
  adImageState.zoom = Math.min(adImageState.zoom + 0.2, 3);
  adImageUpdatePreview();
}

function adImageZoomOut() {
  adImageState.zoom = Math.max(adImageState.zoom - 0.2, 0.5);
  adImageUpdatePreview();
}

function adImageMoveUp() { adImageState.posY -= 10; adImageUpdatePreview(); }
function adImageMoveDown() { adImageState.posY += 10; adImageUpdatePreview(); }
function adImageMoveLeft() { adImageState.posX -= 10; adImageUpdatePreview(); }
function adImageMoveRight() { adImageState.posX += 10; adImageUpdatePreview(); }

function adImageClear() {
  adImageState = { file: null, zoom: 1, posX: 0, posY: 0, uploadedUrl: null, isFromUrl: false };
  document.getElementById('ad-form-image').value = '';
  document.getElementById('ad-form-image-file').value = '';
  document.getElementById('ad-image-editor').style.display = 'none';
  document.getElementById('ad-image-upload-area').style.display = 'block';
  document.getElementById('ad-image-status').innerHTML = '<i class="fa fa-times"></i> Sin imagen';
}

function adImageUrlChanged(url) {
  if (!url) return;
  adImageState = { file: null, zoom: 1, posX: 0, posY: 0, uploadedUrl: url, isFromUrl: true };
  document.getElementById('ad-form-image').value = url;
  document.getElementById('ad-image-editor').style.display = 'none';
  document.getElementById('ad-image-upload-area').style.display = 'none';
  document.getElementById('ad-form-image-preview-url').style.display = 'block';
  document.getElementById('ad-form-image-thumb').src = url;
}

async function adImageUploadAndGetUrl() {
  if (adImageState.isFromUrl && adImageState.uploadedUrl) {
    return adImageState.uploadedUrl;
  }
  
  if (adImageState.file) {
    showToast('Subiendo imagen...', 'info');
    const { uploadAdImage } = await import('./upload.js');
    const url = await uploadAdImage(adImageState.file);
    if (url) {
      adImageState.uploadedUrl = url;
      showToast('Imagen subida', 'success');
      return url;
    }
  }
  
  return null;
}

console.log('[admin.js] Asignando funciones de imagen...');
window.adImageFileSelected = adImageFileSelected;
window.adImageZoomIn = adImageZoomIn;
window.adImageZoomOut = adImageZoomOut;
window.adImageMoveUp = adImageMoveUp;
window.adImageMoveDown = adImageMoveDown;
window.adImageMoveLeft = adImageMoveLeft;
window.adImageMoveRight = adImageMoveRight;
window.adImageClear = adImageClear;
window.adImageUrlChanged = adImageUrlChanged;
window.adImageUploadAndGetUrl = adImageUploadAndGetUrl;
console.log('[admin.js] Funciones asignadas:', typeof window.adImageFileSelected);

function adminPreviewAdImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const thumb = document.getElementById('ad-form-image-thumb');
    const prev  = document.getElementById('ad-form-image-preview');
    const urlInput = document.getElementById('ad-form-image');
    if (thumb) thumb.src = e.target.result;
    if (prev)  prev.style.display = 'block';
    if (urlInput) urlInput.value = e.target.result;
  };
  reader.readAsDataURL(file);
}
window.adminPreviewAdImage = adminPreviewAdImage;

// End of admin.js
