import { store } from './store.js';
import { isSpamMessage } from './security.js';
import { getSupabase } from './supabase.js';
import { showToast, showPage } from './ui.js';

let currentConversationId = null;
let realtimeChannel = null;       // canal realtime activo
let sendingImg = false;           // lock para evitar doble envío de imagen

// ─── CARGAR CONVERSACIONES ────────────────────────────────────────────────────

export async function loadConversations() {
  if (!store.currentUser) return [];
  const sb = getSupabase();
  try {
    const { data: convs, error } = await sb
      .from('conversations')
      .select(`
        id, last_message_at, last_message_preview, updated_at,
        participant_one, participant_two,
        p1:profiles!participant_one(id, full_name, avatar_url),
        p2:profiles!participant_two(id, full_name, avatar_url),
        job:jobs(id, description)
      `)
      .or(`participant_one.eq.${store.currentUser.id},participant_two.eq.${store.currentUser.id}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Contar no leídos en una sola query
    const ids = (convs || []).map(c => c.id);
    let unreadMap = {};
    if (ids.length) {
      const { data: unread } = await sb
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', ids)
        .eq('read', false)
        .neq('sender_id', store.currentUser.id);
      (unread || []).forEach(m => {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
      });
    }

    return (convs || []).map(c => ({
      ...c,
      other_user: c.participant_one === store.currentUser.id ? c.p2 : c.p1,
      unread_count: unreadMap[c.id] || 0
    }));
  } catch (e) {
    console.error('loadConversations:', e);
    return [];
  }
}

// ─── CARGAR MENSAJES ──────────────────────────────────────────────────────────

export async function loadMessages(conversationId) {
  if (!store.currentUser || !conversationId) return [];
  const sb = getSupabase();
  try {
    // Verificar acceso
    const { data: conv } = await sb
      .from('conversations').select('participant_one,participant_two')
      .eq('id', conversationId).maybeSingle();

    if (!conv || (conv.participant_one !== store.currentUser.id && conv.participant_two !== store.currentUser.id)) {
      showToast('Sin acceso a esta conversación', 'error');
      return [];
    }

    const { data: msgs, error } = await sb
      .from('messages')
      .select('*, sender:profiles(id, full_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Marcar como leídos (sin await para no bloquear render)
    sb.from('messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', store.currentUser.id)
      .eq('read', false)
      .then(() => refreshUnreadBadge());

    return msgs || [];
  } catch (e) {
    console.error('loadMessages:', e);
    return [];
  }
}

// ─── ENVIAR MENSAJE ───────────────────────────────────────────────────────────

const MAX_PRE_ACCEPTANCE_MSGS = 5;

export async function sendMessage(conversationId, content, type = 'text', metadata = null) {
  if (!store.currentUser || !conversationId || !content?.trim()) return null;
  const sb = getSupabase();
  try {
    // Verificar límite de mensajes pre-aceptación
    const conv = store._openConv;
    if (conv?.pre_acceptance) {
      const { count } = await sb.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
      if ((count || 0) >= MAX_PRE_ACCEPTANCE_MSGS) {
        showToast(`Límite de ${MAX_PRE_ACCEPTANCE_MSGS} mensajes antes de que el profesional acepte. Esperá su respuesta.`, 'warning');
        return null;
      }
    }
    const payload = {
      conversation_id: conversationId,
      sender_id: store.currentUser.id,
      content: content.trim(),
      type,
      pre_acceptance: conv?.pre_acceptance || false,
      ...(metadata ? { metadata } : {})
    };

    const { data: msg, error } = await sb
      .from('messages').insert(payload)
      .select('*, sender:profiles(id, full_name, avatar_url)').maybeSingle();

    if (error) throw error;

    // Actualizar preview de la conversación
    const preview = type === 'image' ? '📷 Foto' : type === 'budget' ? '💰 Presupuesto' : content.substring(0, 100);
    await sb.from('conversations').update({
      last_message_at: new Date().toISOString(),
      last_message_preview: preview
    }).eq('id', conversationId);

    // Notificación al otro participante
    const { data: convMeta } = await sb.from('conversations')
      .select('participant_one,participant_two').eq('id', conversationId).maybeSingle();
    if (convMeta) {
      const recipientId = convMeta.participant_one === store.currentUser.id ? convMeta.participant_two : convMeta.participant_one;
      const senderName = store.currentUser.user_metadata?.full_name || 'Alguien';
      await sb.from('notifications').insert({
        user_id: recipientId,
        type: 'new_message',
        title: `Mensaje de ${senderName}`,
        message: preview.substring(0, 60),
        data: { conversation_id: conversationId }
      });
    }

    return msg;
  } catch (e) {
    console.error('sendMessage:', e);
    showToast('Error al enviar mensaje', 'error');
    return null;
  }
}

// ─── ENVIAR IMAGEN ────────────────────────────────────────────────────────────

export async function sendImageMessage(conversationId, file) {
  if (!store.currentUser || !conversationId || !file || sendingImg) return;
  sendingImg = true;
  const sb = getSupabase();
  try {
    showToast('Subiendo imagen...', 'info');
    const ext  = file.name.split('.').pop();
    const path = `chat/${store.currentUser.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('work-photos').upload(path, file, { contentType: file.type });
    if (upErr) throw upErr;

    const { data: { publicUrl } } = sb.storage.from('work-photos').getPublicUrl(path);
    await sendMessage(conversationId, publicUrl, 'image');
  } catch (e) {
    console.error('sendImageMessage:', e);
    showToast('Error al subir imagen: ' + e.message, 'error');
  } finally {
    sendingImg = false;
  }
}

// ─── COMPARTIR PRESUPUESTO ────────────────────────────────────────────────────

export async function sendBudgetMessage(conversationId, budget) {
  // budget: { description, price, date }
  const content = JSON.stringify(budget);
  return sendMessage(conversationId, content, 'budget', budget);
}

// ─── CREAR CONVERSACIÓN ───────────────────────────────────────────────────────

export async function createConversation(participantId, jobId = null, isPreAcceptance = false) {
  if (!store.currentUser || !participantId) return null;
  if (!UUID_RE.test(participantId)) {
    console.error('createConversation: participantId inválido:', participantId);
    return null;
  }
  const sb = getSupabase();
  try {
    const { data: conv1 } = await sb.from('conversations').select('*')
      .eq('participant_one', store.currentUser.id).eq('participant_two', participantId).maybeSingle();
    const { data: conv2 } = !conv1 ? await sb.from('conversations').select('*')
      .eq('participant_one', participantId).eq('participant_two', store.currentUser.id).maybeSingle()
      : { data: null };
    const existing = conv1 || conv2;

    if (existing) return { conversation: existing, exists: true };

    const { data: conv, error } = await sb
      .from('conversations')
      .insert({ participant_one: store.currentUser.id, participant_two: participantId, job_id: jobId, pre_acceptance: isPreAcceptance })
      .select().maybeSingle();

    if (error) throw error;
    return { conversation: conv, exists: false };
  } catch (e) {
    console.error('createConversation:', e);
    return null;
  }
}

// ─── REALTIME ─────────────────────────────────────────────────────────────────

function subscribeToConversation(conversationId) {
  const sb = getSupabase();
  if (realtimeChannel) sb.removeChannel(realtimeChannel);

  realtimeChannel = sb.channel(`chat:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, payload => {
      const msg = payload.new;
      // No agregar si es el propio mensaje (ya renderizado optimistamente)
      if (msg.sender_id === store.currentUser?.id) return;
      appendMessage(msg, false);
      // Marcar como leído
      sb.from('messages').update({ read: true, read_at: new Date().toISOString() }).eq('id', msg.id);
      refreshUnreadBadge();
      // Vibración suave en móvil
      if (navigator.vibrate) navigator.vibrate(50);
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, payload => {
      // Actualizar estado leído en los mensajes enviados
      updateMessageReadStatus(payload.new);
    })
    .subscribe(status => {
      console.log('[Chat realtime]', status);
    });
}

function unsubscribeRealtime() {
  const sb = getSupabase();
  if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

export function renderConversationList(conversations) {
  const container = document.getElementById('chat-conversations');
  if (!container) return;

  if (!conversations?.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px 20px;text-align:center;">
        <i class="fa fa-comments" style="font-size:2rem;margin-bottom:10px;display:block;color:var(--gray);"></i>
        <p style="color:var(--gray);font-size:0.88rem;">No tenés conversaciones aún.<br>Contactá a un profesional para empezar.</p>
      </div>`;
    return;
  }

  container.innerHTML = conversations.map(conv => {
    const other    = conv.other_user;
    const name     = other?.full_name || 'Usuario';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const avatar   = other?.avatar_url || '';
    const isActive = currentConversationId === conv.id ? 'active' : '';
    const time     = conv.last_message_at
      ? formatMsgTime(conv.last_message_at)
      : '';
    const unread   = conv.unread_count > 0
      ? `<span class="chat-unread-badge">${conv.unread_count}</span>`
      : '';

    return `
      <div class="chat-conv-item ${isActive}" onclick="window.openConversation('${conv.id}')">
        <div class="chat-conv-avatar" style="${avatar ? `background-image:url('${avatar}');background-size:cover;` : ''}">
          ${!avatar ? initials : ''}
        </div>
        <div class="chat-conv-info">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <div class="chat-conv-name ${conv.unread_count > 0 ? 'font-bold' : ''}">${escHtml(name)}</div>
            <div class="chat-conv-time">${time}</div>
          </div>
          <div class="chat-conv-last">${escHtml(conv.last_message_preview || 'Sin mensajes')}</div>
        </div>
        ${unread}
      </div>`;
  }).join('');
}

export function renderMessages(messages) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  if (!messages?.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:60px 20px;text-align:center;">
        <i class="fa fa-comment-dots" style="font-size:2rem;margin-bottom:10px;display:block;color:var(--gray);"></i>
        <p style="color:var(--gray);font-size:0.85rem;">Todavía no hay mensajes.<br>¡Empezá la conversación!</p>
      </div>`;
    return;
  }

  // Agrupar por fecha
  let lastDate = '';
  container.innerHTML = messages.map(msg => {
    const isSent  = msg.sender_id === store.currentUser?.id;
    const msgDate = msg.created_at ? new Date(msg.created_at).toLocaleDateString('es-AR') : '';
    let dateSep   = '';
    if (msgDate && msgDate !== lastDate) {
      lastDate = msgDate;
      dateSep  = `<div class="chat-date-sep"><span>${formatDateSep(msg.created_at)}</span></div>`;
    }
    return dateSep + renderMsgBubble(msg, isSent);
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function renderMsgBubble(msg, isSent) {
  const time    = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';
  const readIcon = isSent
    ? (msg.read
        ? `<i class="fa fa-check-double" style="color:var(--accent);font-size:0.65rem;" title="Leído"></i>`
        : `<i class="fa fa-check" style="color:rgba(255,255,255,0.5);font-size:0.65rem;" title="Enviado"></i>`)
    : '';

  let bubble = '';
  if (msg.type === 'image') {
    bubble = `<a href="${msg.content}" target="_blank" rel="noopener">
      <img src="${msg.content}" alt="Imagen" style="max-width:220px;max-height:200px;border-radius:10px;display:block;cursor:zoom-in;" loading="lazy">
    </a>`;
  } else if (msg.type === 'budget') {
    let b = {};
    try { b = JSON.parse(msg.content); } catch {}
    bubble = `<div class="chat-budget-card">
      <div style="font-size:0.75rem;color:var(--orange);font-weight:700;margin-bottom:6px;"><i class="fa fa-file-invoice-dollar"></i> PRESUPUESTO</div>
      <div style="font-size:0.9rem;font-weight:600;margin-bottom:4px;">${escHtml(b.description || 'Trabajo')}</div>
      <div style="font-size:1.1rem;font-weight:700;color:var(--green);">$${b.price || 0}</div>
      ${b.date ? `<div style="font-size:0.75rem;color:var(--gray);margin-top:4px;">${b.date}</div>` : ''}
    </div>`;
  } else {
    bubble = `<div class="msg-bubble">${escHtml(msg.content)}</div>`;
  }

  return `<div class="msg ${isSent ? 'sent' : 'received'}" data-msg-id="${msg.id}">
    ${bubble}
    <div class="msg-meta">${time} ${readIcon}</div>
  </div>`;
}

function appendMessage(msg, isSent = true) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  // Quitar empty-state si existe
  const empty = container.querySelector('.empty-state');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.innerHTML = renderMsgBubble(msg, isSent);
  container.appendChild(div.firstElementChild);
  container.scrollTop = container.scrollHeight;
}

function updateMessageReadStatus(msg) {
  if (!msg.read) return;
  const el = document.querySelector(`[data-msg-id="${msg.id}"] .fa-check`);
  if (el) {
    el.classList.replace('fa-check', 'fa-check-double');
    el.style.color = 'var(--accent)';
    el.title = 'Leído';
  }
}

// ─── ABRIR CONVERSACIÓN ───────────────────────────────────────────────────────

export async function openConversation(conversationId) {
  currentConversationId = conversationId;
  // Guardar metadata de la conv para el límite pre-aceptación
  store._openConv = null;

  // Suscribir realtime antes de cargar para no perder mensajes
  subscribeToConversation(conversationId);

  const [messages, conversations] = await Promise.all([
    loadMessages(conversationId),
    loadConversations()
  ]);

  renderMessages(messages);
  renderConversationList(conversations);

  // Header
  const conv = conversations.find(c => c.id === conversationId);
  updateChatHeader(conv);

  // Habilitar barra de input
  const inputBar = document.getElementById('chat-input-bar');
  if (inputBar) inputBar.style.display = '';
}

function updateChatHeader(conv) {
  const header = document.getElementById('chat-header');
  if (!header) return;
  if (!conv) {
    // Sin conversación: mostrar header vacío pero visible
    const avatarEl = document.getElementById('chat-header-avatar');
    const nameEl   = document.getElementById('chat-header-name');
    const subEl    = document.getElementById('chat-header-sub');
    if (avatarEl) { avatarEl.textContent = ''; avatarEl.style.backgroundImage = ''; }
    if (nameEl)   nameEl.textContent = 'Seleccioná una conversación';
    if (subEl)    subEl.textContent  = '';
    header.style.display = '';
    return;
  }
  const other    = conv.other_user;
  const name     = other?.full_name || 'Usuario';
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarEl = document.getElementById('chat-header-avatar');
  const nameEl   = document.getElementById('chat-header-name');
  const subEl    = document.getElementById('chat-header-sub');
  if (avatarEl) {
    if (other?.avatar_url) {
      avatarEl.textContent = '';
      avatarEl.style.backgroundImage  = `url('${other.avatar_url}')`;
      avatarEl.style.backgroundSize   = 'cover';
    } else {
      avatarEl.textContent = initials;
      avatarEl.style.backgroundImage  = '';
    }
  }
  if (nameEl) nameEl.textContent = name;
  if (subEl)  subEl.textContent  = conv.job?.description ? `Trabajo: ${conv.job.description}` : '';
  header.style.display = '';
}

// ─── ENVÍO DESDE UI ───────────────────────────────────────────────────────────

export function sendChatMsg(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChatMsgBtn();
  }
}

export async function sendChatMsgBtn() {
  const input = document.getElementById('chat-input-field');
  const text  = input?.value?.trim();
  if (!text || !currentConversationId) return;
  input.value = '';

  // Render optimista inmediato
  const optimistic = {
    id: 'tmp-' + Date.now(),
    sender_id: store.currentUser.id,
    content: text,
    type: 'text',
    created_at: new Date().toISOString(),
    read: false
  };
  appendMessage(optimistic, true);

  const msg = await sendMessage(currentConversationId, text);
  // Reemplazar burbuja temporal con la real (que tiene id real)
  if (msg) {
    const tmp = document.querySelector('[data-msg-id="' + optimistic.id + '"]');
    if (tmp) tmp.setAttribute('data-msg-id', msg.id);
  }
}

export async function sendChatImage() {
  const input = document.getElementById('chat-image-input');
  input?.click();
}

export async function openShareBudget() {
  if (!currentConversationId) return;
  // Mostrar mini-form inline
  const bar = document.getElementById('chat-budget-form');
  if (bar) bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
}

export async function submitChatBudget() {
  const desc  = document.getElementById('chat-budget-desc')?.value.trim();
  const price = document.getElementById('chat-budget-price')?.value;
  if (!desc || !price) { showToast('Completá descripción y precio', 'error'); return; }
  await sendBudgetMessage(currentConversationId, {
    description: desc,
    price: parseFloat(price),
    date: new Date().toLocaleDateString('es-AR')
  });
  document.getElementById('chat-budget-desc').value  = '';
  document.getElementById('chat-budget-price').value = '';
  const bar = document.getElementById('chat-budget-form');
  if (bar) bar.style.display = 'none';
}

// ─── CERRAR CHAT (exportado para usar desde ui.js también) ───────────────────

export function closeChat() {
  currentConversationId = null;
  // Limpiar estado mobile
  document.getElementById('chat-sidebar')?.classList.remove('slide-out');
  document.getElementById('chat-main-panel')?.classList.remove('slide-in');
  // Limpiar input
  const input = document.getElementById('chat-input-field');
  if (input) input.value = '';
  // showPage llama cleanupChat() automáticamente vía ui.js
  showPage(store.previousPage || 'home');
}

// ─── INIT EVENTS (se llama UNA sola vez al cargar el DOM) ────────────────────

let _chatEventsInit = false;
export function initChatEvents() {
  if (_chatEventsInit) return;
  _chatEventsInit = true;

  // Mensajes
  on('chat-input-field',      'keydown', sendChatMsg);
  on('btn-send-chat',         'click',   sendChatMsgBtn);
  on('btn-chat-image',        'click',   sendChatImage);
  on('btn-chat-budget',       'click',   openShareBudget);
  on('btn-submit-chat-budget','click',   submitChatBudget);

  document.getElementById('chat-image-input')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file || !currentConversationId) return;
    await sendImageMessage(currentConversationId, file);
    e.target.value = '';
  });

  // Búsqueda
  on('chat-search-input', 'input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.chat-conv-item').forEach(el => {
      const name = el.querySelector('.chat-conv-name')?.textContent.toLowerCase() || '';
      el.style.display = name.includes(q) ? '' : 'none';
    });
  });

  // Botones de cerrar
  on('btn-close-chat',      'click', closeChat);
  on('btn-close-chat-main', 'click', closeChat);

  // Mobile: tap en conversación → deslizar al main
  document.getElementById('chat-conversations')?.addEventListener('click', e => {
    if (e.target.closest('.chat-conv-item') && window.innerWidth <= 480) {
      document.getElementById('chat-sidebar')?.classList.add('slide-out');
      document.getElementById('chat-main-panel')?.classList.add('slide-in');
    }
  });

  // Mobile: botón volver → regresar al sidebar
  on('btn-chat-back', 'click', () => {
    document.getElementById('chat-sidebar')?.classList.remove('slide-out');
    document.getElementById('chat-main-panel')?.classList.remove('slide-in');
  });

  // Tecla Escape cierra el chat
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('page-chat')?.classList.contains('active')) {
      closeChat();
    }
  });
}

function on(id, event, handler) {
  document.getElementById(id)?.addEventListener(event, handler);
}

// ─── CARGAR PÁGINA DE CHAT ────────────────────────────────────────────────────

export async function loadChatPage() {
  if (!store.currentUser) {
    showToast('Iniciá sesión para ver tus mensajes', 'info');
    return;
  }
  const conversations = await loadConversations();
  renderConversationList(conversations);

  // Ocultar input bar hasta abrir conversación
  const inputBar = document.getElementById('chat-input-bar');
  if (inputBar) inputBar.style.display = 'none';

  if (conversations.length > 0) {
    await openConversation(conversations[0].id);
  }
}

// ─── OPEN CHAT WITH USER ──────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function openChatWith(userId, jobId = null, isPreAcceptance = false) {
  if (!store.currentUser) {
    const { showModal } = await import('./ui.js');
    showModal('modal-login');
    return;
  }
  if (!userId || userId === 'null' || userId === 'undefined' || !UUID_RE.test(userId)) {
    showToast('No se puede abrir el chat: usuario no encontrado.', 'error');
    return;
  }
  if (userId === store.currentUser.id) {
    showToast('No podés chatear con vos mismo.', 'warning');
    return;
  }
  showPage('chat');
  const result = await createConversation(userId, jobId, isPreAcceptance);
  if (result?.conversation) {
    store._openConv = result.conversation;
    await openConversation(result.conversation.id);
    // Mostrar aviso de límite si es pre-aceptación
    if (result.conversation.pre_acceptance) {
      const sb = getSupabase();
      const { count } = await sb.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', result.conversation.id);
      renderPreAcceptanceBanner(count || 0);
    }
  } else {
    showToast('No se pudo iniciar la conversación. Intentá de nuevo.', 'error');
  }
}

function renderPreAcceptanceBanner(msgCount) {
  const bar = document.getElementById('chat-input-bar');
  if (!bar) return;
  let banner = document.getElementById('pre-acceptance-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'pre-acceptance-banner';
    banner.className = 'pre-acceptance-banner';
    bar.parentNode.insertBefore(banner, bar);
  }
  const remaining = Math.max(0, MAX_PRE_ACCEPTANCE_MSGS - msgCount);
  if (remaining === 0) {
    banner.className = 'pre-acceptance-banner locked';
    banner.innerHTML = '<i class="fa fa-lock"></i> Límite de mensajes previos alcanzado. Esperá que el profesional acepte para continuar.';
    document.getElementById('chat-input-field').disabled = true;
    document.getElementById('btn-send-chat').disabled = true;
  } else {
    banner.innerHTML = `<i class="fa fa-comment-dots"></i> Chat de diagnóstico — ${remaining} mensaje${remaining !== 1 ? 's' : ''} disponible${remaining !== 1 ? 's' : ''} antes de la aceptación.`;
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function escHtml(text) {
  const d = document.createElement('div');
  d.textContent = text || '';
  return d.innerHTML;
}

function formatMsgTime(iso) {
  const d   = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)              return 'ahora';
  if (diff < 3600)            return Math.floor(diff / 60) + 'm';
  if (diff < 86400)           return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (diff < 7 * 86400)      return d.toLocaleDateString('es-AR', { weekday: 'short' });
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function formatDateSep(iso) {
  const d   = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 86400000;
  if (diff < 1) return 'Hoy';
  if (diff < 2) return 'Ayer';
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

async function refreshUnreadBadge() {
  if (!store.currentUser) return;
  const sb = getSupabase();
  const { count } = await sb.from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('read', false)
    .neq('sender_id', store.currentUser.id);
  const badge = document.getElementById('notif-badge');
  if (badge) {
    if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }
}

// Cleanup al salir del chat
export function cleanupChat() {
  unsubscribeRealtime();
}

window.startChatWithPro = async (proId, proName) => {
  const result = await createConversation(proId);
  if (result?.conversation) {
    showPage('chat');
    await openConversation(result.conversation.id);
    if (!result.exists) showToast(`Conversación iniciada${proName ? ' con ' + proName : ''}`, 'success');
  }
};
window.openConversation = openConversation;
