import { getSupabase } from './supabase.js';
import { showToast } from './ui.js';
import { store } from './store.js';

// ── LÍMITE DIARIO DE SOLICITUDES ─────────────────────────────────────────────
export async function checkRequestLimit() {
  const sb = getSupabase();
  const userId = store.currentUser?.id;
  if (!userId) return { allowed: false, reason: 'No autenticado' };

  const { data, error } = await sb.rpc('check_daily_request_limit', { p_user_id: userId });
  if (error) {
    console.warn('checkRequestLimit:', error.message);
    return { allowed: true }; // fallo silencioso — no bloquear por error técnico
  }
  return data;
}

// ── LÍMITE DIARIO DE PRESUPUESTOS ─────────────────────────────────────────────
export async function checkQuoteLimit() {
  const sb = getSupabase();
  const proId = store.currentPro?.id;
  if (!proId) return { allowed: false, reason: 'No sos profesional' };

  const { data, error } = await sb.rpc('check_daily_quote_limit', { p_pro_id: proId });
  if (error) {
    console.warn('checkQuoteLimit:', error.message);
    return { allowed: true };
  }
  return data;
}

// ── ANTI-SPAM: detectar mensajes repetidos ────────────────────────────────────
const _msgHistory = new Map(); // userId → últimos mensajes

export function isSpamMessage(userId, text) {
  if (!text || text.trim().length < 2) return false;
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');

  if (!_msgHistory.has(userId)) _msgHistory.set(userId, []);
  const history = _msgHistory.get(userId);

  // Detectar repetición de palabras en el mismo mensaje
  const words = normalized.split(' ');
  const unique = new Set(words);
  if (words.length >= 4 && unique.size / words.length < 0.4) {
    return { spam: true, reason: 'Mensaje con demasiadas palabras repetidas' };
  }

  // Detectar mismo mensaje enviado 3+ veces seguidas
  const last3 = history.slice(-3);
  if (last3.length >= 3 && last3.every(m => m === normalized)) {
    return { spam: true, reason: 'Mismo mensaje enviado repetidamente' };
  }

  // Detectar flood: 5+ mensajes en 10 segundos
  const now = Date.now();
  const recent = history.filter(m => typeof m === 'object' && now - m.ts < 10000);
  if (recent.length >= 5) {
    return { spam: true, reason: 'Demasiados mensajes en poco tiempo' };
  }

  // Guardar en historial (guardamos texto + timestamp)
  history.push(normalized);
  history.push({ ts: now });
  if (history.length > 30) history.splice(0, 10);

  return false;
}

// ── HUELLA DE DISPOSITIVO ─────────────────────────────────────────────────────
export function getDeviceFingerprint() {
  const nav = navigator;
  const parts = [
    nav.userAgent,
    nav.language,
    screen.width + 'x' + screen.height,
    nav.hardwareConcurrency || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  // Hash simple
  const str = parts.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ── REGISTRAR HUELLA AL LOGIN ─────────────────────────────────────────────────
export async function registerFingerprint(userId) {
  const sb = getSupabase();
  const fp = getDeviceFingerprint();
  try {
    const { error: e1 } = await sb.from('profiles')
      .update({ device_fingerprint: fp }).eq('id', userId);
    if (e1) return; // columna aún no existe — migración pendiente

    const { data: others, error: e2 } = await sb.from('profiles')
      .select('id')
      .eq('device_fingerprint', fp)
      .neq('id', userId);
    if (e2 || !others?.length) return;

    if (others.length >= 2) {
      await sb.from('profiles').update({
        suspicious_flag: true,
        suspicious_reason: `Dispositivo compartido con ${others.length} cuenta(s) más`,
      }).eq('id', userId);
    }
  } catch { /* migración pendiente */ }
}

// ── ADVERTENCIAS EN PERFIL DEL PRO ────────────────────────────────────────────
export function getProWarnings(pro) {
  const warnings = [];

  if ((pro.cancel_count || 0) >= 3) {
    warnings.push({
      level: 'danger',
      icon: 'fa-triangle-exclamation',
      text: `Este profesional tiene ${pro.cancel_count} cancelaciones recientes.`,
    });
  } else if ((pro.cancel_count || 0) >= 1) {
    warnings.push({
      level: 'warning',
      icon: 'fa-circle-exclamation',
      text: `Este profesional tiene ${pro.cancel_count} cancelación${pro.cancel_count > 1 ? 'es' : ''} registrada${pro.cancel_count > 1 ? 's' : ''}.`,
    });
  }

  if ((pro.report_count || 0) >= 3) {
    warnings.push({
      level: 'danger',
      icon: 'fa-flag',
      text: `Este profesional tiene múltiples reportes de usuarios.`,
    });
  } else if ((pro.report_count || 0) >= 1) {
    warnings.push({
      level: 'warning',
      icon: 'fa-flag',
      text: `Este profesional tiene ${pro.report_count} reporte${pro.report_count > 1 ? 's' : ''} de usuarios.`,
    });
  }

  if (pro.suspended) {
    warnings.push({
      level: 'danger',
      icon: 'fa-ban',
      text: 'Este profesional está suspendido temporalmente.',
    });
  }

  return warnings;
}

export function renderProWarnings(pro) {
  const warnings = getProWarnings(pro);
  if (!warnings.length) return '';
  return warnings.map(w => `
    <div class="pro-warning pro-warning--${w.level}">
      <i class="fa ${w.icon}"></i>
      <span>${w.text}</span>
    </div>
  `).join('');
}

// ── HISTORIAL VISIBLE DEL PRO ─────────────────────────────────────────────────
export function renderProStats(pro) {
  const completed  = pro.completed_jobs  || 0;
  const cancels    = pro.cancel_count    || 0;
  const reports    = pro.report_count    || 0;
  const trust      = pro.trust_score     || 100;
  const trustColor = trust >= 80 ? 'var(--green)' : trust >= 50 ? 'var(--orange)' : '#f87171';

  return `
    <div class="pro-stats-grid">
      <div class="pro-stat-item">
        <i class="fa fa-check-circle" style="color:var(--green);"></i>
        <span class="pro-stat-num">${completed}</span>
        <span class="pro-stat-label">Completados</span>
      </div>
      <div class="pro-stat-item">
        <i class="fa fa-xmark" style="color:#f87171;"></i>
        <span class="pro-stat-num">${cancels}</span>
        <span class="pro-stat-label">Cancelaciones</span>
      </div>
      <div class="pro-stat-item">
        <i class="fa fa-star" style="color:var(--orange);"></i>
        <span class="pro-stat-num">${pro.avg_rating ? pro.avg_rating.toFixed(1) : '—'}</span>
        <span class="pro-stat-label">Puntuación</span>
      </div>
      <div class="pro-stat-item">
        <i class="fa fa-shield-halved" style="color:${trustColor};"></i>
        <span class="pro-stat-num" style="color:${trustColor};">${trust}%</span>
        <span class="pro-stat-label">Confiabilidad</span>
      </div>
    </div>
  `;
}

// ── BOTÓN REPORTAR PROFESIONAL ────────────────────────────────────────────────
export function openReportModal(professionalId, jobId = null) {
  const modal = document.getElementById('modal-report-pro');
  if (!modal) return;
  document.getElementById('report-pro-id').value  = professionalId;
  document.getElementById('report-job-id').value  = jobId || '';
  modal.classList.add('open');
}

export async function submitProReport() {
  const sb     = getSupabase();
  const proId  = document.getElementById('report-pro-id')?.value;
  const jobId  = document.getElementById('report-job-id')?.value || null;
  const reason = document.getElementById('report-reason')?.value;
  const desc   = document.getElementById('report-desc')?.value?.trim();

  if (!reason) { showToast('Seleccioná un motivo', 'warning'); return; }

  const userId = store.currentUser?.id;
  if (!userId) { showToast('Debés iniciar sesión', 'warning'); return; }

  try {
    const { error } = await sb.from('reports').insert({
      reporter_id:     userId,
      professional_id: proId,
      job_id:          jobId,
      reason,
      description:     desc || null,
    });
    if (error) throw error;

    showToast('Reporte enviado. Lo revisaremos a la brevedad.', 'success');
    document.getElementById('modal-report-pro')?.classList.remove('open');
    // Limpiar form
    document.getElementById('report-reason').value = '';
    document.getElementById('report-desc').value   = '';
  } catch(e) {
    showToast('Error al enviar reporte: ' + e.message, 'error');
  }
}

window.openReportModal  = openReportModal;
window.submitProReport  = submitProReport;
