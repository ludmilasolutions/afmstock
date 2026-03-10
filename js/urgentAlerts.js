import { getSupabase } from './supabase.js';
import { store } from './store.js';
import { showToast } from './ui.js';

let alertChannel = null;
let currentAlertData = null;
let timerInterval = null;
let timeLeft = 30;

export function initUrgentAlerts() {
  if (!store.currentUser || !store.isPro) return;
  
  const sb = getSupabase();
  
  // Suscribirse a notificaciones de urgencias
  alertChannel = sb.channel('urgent-notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${store.currentUser.id}`
    }, async (payload) => {
      const notification = payload.new;
      
      // Solo mostrar alerta si es urgencia y no leída
      if (notification.type === 'urgent_request' && !notification.read) {
        const data = JSON.parse(notification.data || '{}');
        await showUrgentAlert({
          notificationId: notification.id,
          urgentRequestId: data.urgent_request_id,
          specialty: data.specialty,
          address: data.address,
          distance: data.distance,
          title: notification.title,
          message: notification.message
        });
      }
    })
    .subscribe();
  
  console.log('Urgent alerts system initialized');
}

export function stopUrgentAlerts() {
  if (alertChannel) {
    alertChannel.unsubscribe();
    alertChannel = null;
  }
  hideUrgentAlert();
}

async function showUrgentAlert(data) {
  currentAlertData = data;
  
  // Reproducir sonido
  const sound = document.getElementById('urgent-alert-sound');
  if (sound) {
    sound.volume = 0.5;
    sound.play().catch(e => console.log('Could not play sound:', e));
  }
  
  // Vibrar si está disponible
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
  
  // Cargar detalles de la solicitud
  const sb = getSupabase();
  const { data: request, error } = await sb
    .from('urgent_requests')
    .select('*, user:profiles!user_id(full_name, avatar_url)')
    .eq('id', data.urgentRequestId)
    .single();
  
  if (error || !request) {
    console.error('Error loading urgent request:', error);
    return;
  }
  
  // Mostrar modal
  const modal = document.getElementById('urgent-alert-modal');
  const content = document.getElementById('urgent-alert-content');
  
  if (!modal || !content) return;
  
  const userName = request.user?.full_name || 'Cliente';
  const userInitial = userName.charAt(0).toUpperCase();
  
  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;">
      <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-weight:900;color:white;flex-shrink:0;">
        ${userInitial}
      </div>
      <div style="flex:1;">
        <div style="font-size:1.1rem;font-weight:700;color:var(--light);margin-bottom:4px;">${escapeHtml(userName)}</div>
        <div style="font-size:0.85rem;color:var(--gray);">
          <i class="fa fa-location-dot" style="color:var(--accent);"></i> ${data.distance.toFixed(1)} km de distancia
        </div>
      </div>
    </div>
    
    <div style="margin-bottom:16px;">
      <div style="font-size:0.8rem;color:var(--gray);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Especialidad</div>
      <div style="font-size:1rem;font-weight:600;color:var(--orange);padding:8px 12px;background:rgba(249,115,22,0.1);border-radius:8px;display:inline-block;">
        <i class="fa fa-wrench"></i> ${escapeHtml(data.specialty)}
      </div>
    </div>
    
    <div style="margin-bottom:16px;">
      <div style="font-size:0.8rem;color:var(--gray);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Descripción</div>
      <div style="font-size:0.95rem;color:var(--light);line-height:1.5;">${escapeHtml(request.description)}</div>
    </div>
    
    <div style="margin-bottom:16px;">
      <div style="font-size:0.8rem;color:var(--gray);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Dirección</div>
      <div style="font-size:0.9rem;color:var(--light);display:flex;align-items:center;gap:8px;">
        <i class="fa fa-map-marker-alt" style="color:var(--accent);"></i>
        ${escapeHtml(data.address)}
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
  
  // Iniciar timer
  startTimer();
  
  // Setup buttons
  document.getElementById('accept-urgent-alert').onclick = () => acceptUrgentAlert();
  document.getElementById('reject-urgent-alert').onclick = () => rejectUrgentAlert();
}

function hideUrgentAlert() {
  const modal = document.getElementById('urgent-alert-modal');
  if (modal) modal.style.display = 'none';
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  currentAlertData = null;
  timeLeft = 30;
}

function startTimer() {
  timeLeft = 30;
  updateTimerDisplay();
  
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    
    if (timeLeft <= 0) {
      rejectUrgentAlert(); // Auto-rechazar al expirar
    }
  }, 1000);
}

function updateTimerDisplay() {
  const timerText = document.getElementById('timer-text');
  const timerCircle = document.getElementById('timer-circle');
  
  if (timerText) {
    timerText.textContent = timeLeft;
    
    // Cambiar color en los últimos 10 segundos
    if (timeLeft <= 10) {
      timerText.style.color = '#ef4444';
    }
  }
  
  if (timerCircle) {
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (timeLeft / 30) * circumference;
    timerCircle.style.strokeDashoffset = offset;
    
    if (timeLeft <= 10) {
      timerCircle.style.stroke = '#ef4444';
    }
  }
}

async function acceptUrgentAlert() {
  if (!currentAlertData) return;
  
  const sb = getSupabase();
  
  try {
    // Verificar que aún está disponible
    const { data: request } = await sb
      .from('urgent_requests')
      .select('status')
      .eq('id', currentAlertData.urgentRequestId)
      .single();
    
    if (request?.status !== 'solicitado') {
      showToast('Esta solicitud ya fue aceptada por otro profesional', 'warning');
      hideUrgentAlert();
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
      .eq('id', currentAlertData.urgentRequestId);
    
    if (updateError) throw updateError;
    
    // Marcar notificación como leída
    await sb
      .from('notifications')
      .update({ read: true })
      .eq('id', currentAlertData.notificationId);
    
    // Crear el trabajo
    const { data: urgentReq } = await sb
      .from('urgent_requests')
      .select('*')
      .eq('id', currentAlertData.urgentRequestId)
      .single();
    
    await sb.from('jobs').insert({
      user_id: urgentReq.user_id,
      professional_id: store.currentUser.id,
      specialty: urgentReq.specialty,
      description: urgentReq.description,
      address: urgentReq.address,
      latitude: urgentReq.latitude,
      longitude: urgentReq.longitude,
      status: 'aceptado',
      is_urgent: true
    });
    
    showToast('¡Solicitud aceptada! El cliente será notificado', 'success');
    hideUrgentAlert();
    
    // Recargar dashboard
    setTimeout(() => {
      const { loadProDashboard } = require('./dashboard.js');
      loadProDashboard();
    }, 500);
    
  } catch (error) {
    console.error('Error accepting urgent request:', error);
    showToast('Error al aceptar solicitud', 'error');
  }
}

async function rejectUrgentAlert() {
  if (!currentAlertData) return;
  
  const sb = getSupabase();
  
  // Marcar notificación como leída
  await sb
    .from('notifications')
    .update({ read: true })
    .eq('id', currentAlertData.notificationId);
  
  hideUrgentAlert();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export para window
if (typeof window !== 'undefined') {
  window.initUrgentAlerts = initUrgentAlerts;
  window.stopUrgentAlerts = stopUrgentAlerts;
}
