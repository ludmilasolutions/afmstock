// =====================================================
// SISTEMA DE CALIFICACIONES BIDIRECCIONALES
// Permite que profesionales califiquen a usuarios
// =====================================================

import { getSupabase } from './supabase.js';
import { store } from './store.js';
import { showToast, showModal, closeModal } from './ui.js';

// =====================================================
// FUNCIONES PARA CALIFICAR USUARIOS (Profesional -> Usuario)
// =====================================================

/**
 * Abre el modal para que un profesional califique a un usuario
 * @param {string} jobId - ID del trabajo completado
 * @param {string} userId - ID del usuario a calificar
 * @param {string} userName - Nombre del usuario
 */
export function openRateUserModal(jobId, userId, userName) {
  if (!store.currentUser || !store.isPro) {
    showToast('Solo los profesionales pueden calificar usuarios', 'error');
    return;
  }

  const modal = document.getElementById('modal-rate-user');
  if (!modal) {
    console.error('Modal de calificación de usuario no encontrado');
    return;
  }

  // Guardar datos en el modal
  modal.dataset.jobId = jobId;
  modal.dataset.userId = userId;
  
  // Actualizar nombre del usuario en el modal
  const userNameEl = document.getElementById('rate-user-name');
  if (userNameEl) userNameEl.textContent = userName;

  // Reset form
  resetRateUserForm();

  showModal('modal-rate-user');
}

/**
 * Resetea el formulario de calificación de usuario
 */
function resetRateUserForm() {
  // Reset ratings
  ['cumplimiento', 'respeto', 'claridad', 'comunicacion'].forEach(category => {
    const stars = document.querySelectorAll(`#user-rating-${category} .star-rate`);
    stars.forEach(star => star.classList.remove('active'));
    
    const input = document.getElementById(`user-${category}-value`);
    if (input) input.value = '0';
  });

  // Reset overall rating
  const overallStars = document.querySelectorAll('#user-rating-overall .star-rate');
  overallStars.forEach(star => star.classList.remove('active'));
  
  const overallInput = document.getElementById('user-rating-value');
  if (overallInput) overallInput.value = '0';

  // Reset comment
  const comment = document.getElementById('user-rating-comment');
  if (comment) comment.value = '';
}

/**
 * Maneja el click en las estrellas para calificar
 * @param {string} category - Categoría que se está calificando
 * @param {number} value - Valor de 1-5
 */
export function setUserRating(category, value) {
  const stars = document.querySelectorAll(`#user-rating-${category} .star-rate`);
  stars.forEach((star, index) => {
    if (index < value) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });

  const input = document.getElementById(`user-${category}-value`);
  if (input) input.value = value;

  // Actualizar rating general automáticamente
  if (category !== 'overall') {
    updateOverallUserRating();
  }
}

/**
 * Actualiza el rating general basado en las categorías
 */
function updateOverallUserRating() {
  const categories = ['cumplimiento', 'respeto', 'claridad', 'comunicacion'];
  let sum = 0;
  let count = 0;

  categories.forEach(cat => {
    const input = document.getElementById(`user-${cat}-value`);
    if (input && input.value && parseFloat(input.value) > 0) {
      sum += parseFloat(input.value);
      count++;
    }
  });

  if (count > 0) {
    const avg = sum / count;
    const rounded = Math.round(avg);
    setUserRating('overall', rounded);
  }
}

/**
 * Envía la calificación del usuario a la base de datos
 */
export async function submitUserRating() {
  const modal = document.getElementById('modal-rate-user');
  if (!modal) return;

  const jobId = modal.dataset.jobId;
  const userId = modal.dataset.userId;

  // Validar que tenga rating general
  const ratingValue = document.getElementById('user-rating-value')?.value;
  if (!ratingValue || parseFloat(ratingValue) === 0) {
    showToast('Por favor selecciona una calificación general', 'warning');
    return;
  }

  // Obtener valores
  const cumplimiento = parseFloat(document.getElementById('user-cumplimiento-value')?.value) || null;
  const respeto = parseFloat(document.getElementById('user-respeto-value')?.value) || null;
  const claridad = parseFloat(document.getElementById('user-claridad-value')?.value) || null;
  const comunicacion = parseFloat(document.getElementById('user-comunicacion-value')?.value) || null;
  const comment = document.getElementById('user-rating-comment')?.value || '';

  const sb = getSupabase();
  if (!sb) {
    showToast('Error de conexión', 'error');
    return;
  }

  try {
    // Verificar si ya existe una review para este trabajo
    const { data: existingReview } = await sb
      .from('reviews')
      .select('id')
      .eq('job_id', jobId)
      .eq('reviewer_type', 'professional')
      .eq('professional_id', store.currentUser.id)
      .maybeSingle();

    if (existingReview) {
      showToast('Ya has calificado a este usuario', 'warning');
      closeModal('modal-rate-user');
      return;
    }

    // Insertar la review
    const { error } = await sb.from('reviews').insert({
      job_id: jobId,
      user_id: userId,
      professional_id: store.currentUser.id,
      reviewed_user_id: userId,
      reviewer_type: 'professional',
      rating: parseFloat(ratingValue),
      cumplimiento: cumplimiento,
      respeto: respeto,
      claridad: claridad,
      comunicacion: comunicacion,
      comment: comment,
      is_public: true
    });

    if (error) throw error;

    // Actualizar contador de trabajos del usuario
    await sb.rpc('increment_user_jobs', { user_id: userId });

    showToast('¡Calificación enviada exitosamente!', 'success');
    closeModal('modal-rate-user');

    // Recargar la lista de trabajos si estamos en dashboard
    if (typeof window.loadProJobs === 'function') {
      window.loadProJobs();
    }

  } catch (error) {
    console.error('Error al enviar calificación:', error);
    showToast('Error al enviar la calificación', 'error');
  }
}

// =====================================================
// FUNCIONES PARA VER CALIFICACIONES DE USUARIOS
// =====================================================

/**
 * Obtiene las estadísticas de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Estadísticas del usuario
 */
export async function getUserStats(userId) {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from('v_user_ratings')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al obtener estadísticas del usuario:', error);
    return null;
  }
}

/**
 * Obtiene las reviews que ha recibido un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Lista de reviews
 */
export async function getUserReviews(userId, limit = 10) {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from('reviews')
      .select('id, rating, cumplimiento, respeto, claridad, comunicacion, comment, created_at, professional_id')
      .eq('reviewed_user_id', userId)
      .eq('reviewer_type', 'professional')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Cargar nombres de los profesionales
    if (data && data.length > 0) {
      const proIds = [...new Set(data.map(r => r.professional_id).filter(Boolean))];
      const { data: profiles } = await sb
        .from('profiles')
        .select('id, full_name')
        .in('id', proIds);

      const namesMap = {};
      (profiles || []).forEach(p => { namesMap[p.id] = p.full_name; });

      return data.map(r => ({
        ...r,
        professional_name: namesMap[r.professional_id] || 'Profesional'
      }));
    }

    return data || [];
  } catch (error) {
    console.error('Error al obtener reviews del usuario:', error);
    return [];
  }
}

/**
 * Muestra la información de confiabilidad del usuario en un elemento
 * @param {string} userId - ID del usuario
 * @param {string} containerId - ID del contenedor donde mostrar la info
 */
export async function renderUserTrustInfo(userId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const stats = await getUserStats(userId);
  if (!stats) {
    container.innerHTML = '<p style="color:var(--gray);font-size:0.85rem;">No hay información disponible</p>';
    return;
  }

  const trustColor = stats.user_trust_score >= 80 ? 'var(--green)' :
                     stats.user_trust_score >= 50 ? 'var(--orange)' : '#f87171';

  container.innerHTML = `
    <div style="background:var(--glass);padding:16px;border-radius:var(--radius-sm);border:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="flex:1;">
          <div style="font-size:0.75rem;color:var(--gray);margin-bottom:4px;">Confiabilidad del Cliente</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">
              <div style="width:${stats.user_trust_score}%;height:100%;background:${trustColor};transition:width 0.3s;"></div>
            </div>
            <span style="font-weight:700;color:${trustColor};font-size:0.9rem;">${stats.user_trust_score}%</span>
          </div>
        </div>
      </div>
      
      <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px;margin-bottom:12px;">
        <div>
          <div style="font-size:0.7rem;color:var(--gray);">Calificación</div>
          <div style="font-weight:700;color:var(--accent);">${stats.user_avg_rating ? stats.user_avg_rating.toFixed(1) + ' ★' : 'Sin calif.'}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;color:var(--gray);">Reviews</div>
          <div style="font-weight:700;">${stats.user_reviews_count || 0}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;color:var(--gray);">Trabajos</div>
          <div style="font-weight:700;">${stats.jobs_as_client || 0}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;color:var(--gray);">Cancelaciones</div>
          <div style="font-weight:700;color:${stats.cancelled_as_client > 0 ? 'var(--orange)' : 'var(--green)'};">${stats.cancelled_as_client || 0}</div>
        </div>
      </div>

      ${stats.avg_cumplimiento > 0 ? `
        <div style="font-size:0.75rem;color:var(--gray);margin-bottom:6px;">Valoraciones:</div>
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;font-size:0.7rem;">
          <div style="text-align:center;">
            <div style="color:var(--gray);">Cumplimiento</div>
            <div style="font-weight:700;color:var(--accent);">${stats.avg_cumplimiento.toFixed(1)}</div>
          </div>
          <div style="text-align:center;">
            <div style="color:var(--gray);">Respeto</div>
            <div style="font-weight:700;color:var(--accent);">${stats.avg_respeto.toFixed(1)}</div>
          </div>
          <div style="text-align:center;">
            <div style="color:var(--gray);">Claridad</div>
            <div style="font-weight:700;color:var(--accent);">${stats.avg_claridad.toFixed(1)}</div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// =====================================================
// EVENTOS Y INICIALIZACIÓN
// =====================================================

export function initRatingEvents() {
  // Botón para enviar calificación de usuario
  const submitBtn = document.getElementById('btn-submit-user-rating');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitUserRating);
  }

  // Stars para calificar usuario
  const categories = ['overall', 'cumplimiento', 'respeto', 'claridad', 'comunicacion'];
  categories.forEach(category => {
    const stars = document.querySelectorAll(`#user-rating-${category} .star-rate`);
    stars.forEach((star, index) => {
      star.addEventListener('click', () => setUserRating(category, index + 1));
    });
  });
}

// Exportar funciones al objeto window para acceso desde HTML
window.openRateUserModal = openRateUserModal;
window.setUserRating = setUserRating;
window.submitUserRating = submitUserRating;
window.getUserStats = getUserStats;
window.getUserReviews = getUserReviews;
window.renderUserTrustInfo = renderUserTrustInfo;
