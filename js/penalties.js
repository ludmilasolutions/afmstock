import { getSupabase } from './supabase.js';
import { showToast } from './ui.js';

// ─── PESOS DE PENALIZACIÓN ────────────────────────────────────────────────────
export const PENALTY_WEIGHTS = {
  cancel:       -10,
  no_response:  -3,
  bad_review:   -8,
  report:       -15,
  warning:       0,   // warning no baja score, solo es registro
};

// ─── APLICAR PENALIZACIÓN (solo admin) ───────────────────────────────────────
export async function applyPenalty({ targetId, targetType, type, description, adminId }) {
  const sb = getSupabase();
  const delta = PENALTY_WEIGHTS[type] ?? 0;

  const { data, error } = await sb.rpc('apply_penalty', {
    p_target_id:   targetId,
    p_target_type: targetType,
    p_type:        type,
    p_description: description,
    p_delta:       delta,
    p_applied_by:  adminId,
  });

  if (error) throw error;
  return data;
}

// ─── REVERTIR PENALIZACIÓN ────────────────────────────────────────────────────
export async function revertPenalty(penaltyId, adminId) {
  const sb = getSupabase();
  const { error } = await sb.rpc('revert_penalty', {
    p_penalty_id: penaltyId,
    p_admin_id:   adminId,
  });
  if (error) throw error;
}

// ─── SUSPENDER PROFESIONAL (admin) ───────────────────────────────────────────
export async function suspendPro({ proId, reason, days, adminId }) {
  const sb = getSupabase();
  const until = days
    ? new Date(Date.now() + days * 86400000).toISOString()
    : null;

  const { error } = await sb.from('professionals')
    .update({ suspended: true, suspended_until: until, suspension_reason: reason })
    .eq('id', proId);

  if (error) throw error;

  // Registrar como penalización
  await applyPenalty({
    targetId: proId, targetType: 'professional',
    type: 'suspension', description: reason, adminId,
  });
}

export async function unsuspendPro(proId) {
  const sb = getSupabase();
  await sb.from('professionals')
    .update({ suspended: false, suspended_until: null, suspension_reason: null })
    .eq('id', proId);
}

// ─── BLOQUEAR URGENTES ────────────────────────────────────────────────────────
export async function setUrgentBlock(proId, blocked) {
  const sb = getSupabase();
  await sb.from('professionals').update({ urgent_blocked: blocked }).eq('id', proId);
}

// ─── BLOQUEAR USUARIO TEMPORAL ────────────────────────────────────────────────
export async function blockUserTemp({ userId, days, adminId }) {
  const sb = getSupabase();
  const until = new Date(Date.now() + days * 86400000).toISOString();
  await sb.from('profiles').update({ blocked_until: until }).eq('id', userId);
  await applyPenalty({
    targetId: userId, targetType: 'user',
    type: 'suspension', description: `Bloqueo temporal ${days}d`, adminId,
  });
}

// ─── CARGAR PENALIZACIONES DE UN TARGET ───────────────────────────────────────
export async function loadPenalties(targetId) {
  const sb = getSupabase();
  const { data } = await sb
    .from('penalties')
    .select('*')
    .eq('target_id', targetId)
    .order('created_at', { ascending: false });
  return data || [];
}

// ─── CARGAR REPORTES (admin) ──────────────────────────────────────────────────
export async function loadReports(status = 'pending') {
  const sb = getSupabase();
  const q = sb.from('reports')
    .select('*, reporter:reporter_id(full_name:profiles(full_name)), professionals(id,user_id,profiles:user_id(full_name))')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status !== 'all') q.eq('status', status);
  const { data } = await q;
  return data || [];
}

// ─── CAMBIAR ESTADO REPORTE ───────────────────────────────────────────────────
export async function reviewReport(reportId, status, adminId) {
  const sb = getSupabase();
  await sb.from('reports').update({
    status,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  }).eq('id', reportId);
}

// ─── ENVIAR REPORTE (usuario sobre profesional) ───────────────────────────────
export async function submitReport({ reporterId, professionalId, jobId, reason, description }) {
  const sb = getSupabase();
  const { error } = await sb.from('reports').insert({
    reporter_id:     reporterId,
    professional_id: professionalId,
    job_id:          jobId || null,
    reason,
    description,
  });
  if (error) throw error;
}

// ─── AUTO-PENALIZACIÓN cuando un pro cancela un trabajo aceptado ───────────────
export async function onProCancelJob(proId, jobId) {
  const sb = getSupabase();
  const { data: pro } = await sb
    .from('professionals')
    .select('cancel_count, warning_count, user_id')
    .eq('id', proId)
    .maybeSingle();

  if (!pro) return;
  const nextCancels = (pro.cancel_count || 0) + 1;
  let penaltyType = 'cancel';
  let desc = `Cancelación de trabajo (total: ${nextCancels})`;

  if (nextCancels === 1) {
    penaltyType = 'warning';
    desc = 'Advertencia: primera cancelación de trabajo aceptado';
  }

  await applyPenalty({
    targetId: proId, targetType: 'professional',
    type: penaltyType, description: desc, adminId: null,
  });
}

// ─── AUTO-PENALIZACIÓN cuando un usuario cancela ─────────────────────────────
export async function onUserCancelJob(userId) {
  const sb = getSupabase();
  const { data: profile } = await sb
    .from('profiles')
    .select('cancel_count')
    .eq('id', userId)
    .maybeSingle();

  const nextCancels = (profile?.cancel_count || 0) + 1;
  let type = 'cancel';
  let desc = `Cancelación de solicitud (total: ${nextCancels})`;

  if (nextCancels >= 3 && nextCancels < 5) {
    type = 'warning';
    desc = `Advertencia: ${nextCancels} cancelaciones acumuladas`;
  }

  await applyPenalty({
    targetId: userId, targetType: 'user',
    type, description: desc, adminId: null,
  });
}
