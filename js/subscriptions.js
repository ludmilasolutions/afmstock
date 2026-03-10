import { store } from './store.js';
import { getSupabase } from './supabase.js';
import { showModal, closeModal, showToast } from './ui.js';
import { SUBSCRIPTION_PRICE } from './config.js';

export function showSuscripcion() {
  showModal('modal-subscription');
}

export async function subscribePro() {
  if (!store.currentUser) {
    closeModal('modal-subscription');
    showModal('modal-login');
    return;
  }
  
  const sb = getSupabase();
  
  const { error } = await sb.from('subscriptions').insert({
    professional_id: store.currentPro?.id,
    user_id: store.currentUser.id,
    type: 'destacado',
    status: 'active',
    price: 5000,
    currency: 'ARS',
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
  
  if (!error && store.currentPro) {
    await sb.from('professionals').update({ is_featured: true }).eq('id', store.currentPro.id);
    store.currentPro.is_featured = true;
  }
  
  closeModal('modal-subscription');
  
  if (error) {
    showToast('Error al procesar suscripción', 'error');
  } else {
    showToast('¡Plan Destacado activado!', 'success');
  }
}

export async function checkSubscription() {
  if (!store.currentPro) return false;
  
  const sb = getSupabase();
  try {
    const { data } = await sb.from('subscriptions')
      .select('*')
      .eq('professional_id', store.currentPro.id)
      .eq('status', 'active')
      .maybeSingle();
    
    if (data) {
      const endDate = new Date(data.ends_at);
      if (endDate > new Date()) {
        return true;
      }
    }
  } catch {}
  
  return false;
}

export async function cancelSubscription() {
  if (!store.currentPro) return;
  
  const sb = getSupabase();
  const { error } = await sb.from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('professional_id', store.currentPro.id)
    .eq('status', 'active');
  
  if (!error) {
    await sb.from('professionals').update({ is_featured: false }).eq('id', store.currentPro.id);
    store.currentPro.is_featured = false;
    showToast('Suscripción cancelada', 'info');
  }
}
