/**
 * floatChat.js — Chat flotante estilo Messenger para TECNIYA
 * Usa la lógica existente de chat.js (loadConversations, loadMessages, etc.)
 * y la muestra en un panel persistente sin cambiar de página.
 */

import { store } from './store.js';
import {
  loadConversations,
  loadMessages,
  sendMessage,
  createConversation,
  openConversation as coreOpenConversation
} from './chat.js';
import { getSupabase } from './supabase.js';

// ── Estado ────────────────────────────────────────────────────────────────────
let _open        = false;
let _convId      = null;         // conversación activa en el flotante
let _convs       = [];           // lista cacheada
let _realtimeCh  = null;
let _initialized = false;
let _currentOtherUser = null;

// ── Helpers DOM ───────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const esc = s  => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ── INICIALIZACIÓN ────────────────────────────────────────────────────────────
export function initFloatChat() {
  if (_initialized) return;
  _initialized = true;

  // Mostrar burbuja solo si hay usuario logueado
  if (store.currentUser) showBubble();

  // Input imagen
  $('fchat-image-input')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file || !_convId) return;
    const { sendImageMessage } = await import('./chat.js');
    await sendImageMessage(_convId, file);
    e.target.value = '';
    await refreshMessages();
  });

  // Cerrar al pulsar Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _open) closeFloatChat();
  });

  // Cerrar al hacer click fuera (solo desktop)
  document.addEventListener('click', e => {
    const panel  = $('fchat-panel');
    const bubble = $('fchat-bubble');
    if (!_open) return;
    if (panel  && panel.contains(e.target))  return;
    if (bubble && bubble.contains(e.target)) return;
    if (window.innerWidth > 640) closeFloatChat();
  });
}

export function showBubble() {
  $('fchat-bubble')?.classList.remove('hidden');
}

// ── TOGGLE PANEL ──────────────────────────────────────────────────────────────
export async function toggleFloatChat() {
  _open ? closeFloatChat() : openFloatChat();
}

async function openFloatChat() {
  if (!store.currentUser) return;
  _open = true;

  const panel  = $('fchat-panel');
  const bubble = $('fchat-bubble');
  panel?.classList.add('fchat-panel--open');
  bubble?.classList.add('fchat-open');

  // Siempre refrescar la lista al abrir
  await loadConvList();
  showView('list');
}

function closeFloatChat() {
  _open = false;
  $('fchat-panel')?.classList.remove('fchat-panel--open');
  $('fchat-bubble')?.classList.remove('fchat-open');
  stopRealtime();
}

// ── VISTAS ────────────────────────────────────────────────────────────────────
function showView(which) {   // 'list' | 'chat'
  const vList = $('fchat-view-list');
  const vChat = $('fchat-view-chat');
  if (!vList || !vChat) return;
  if (which === 'list') {
    vList.classList.remove('fchat-view--hidden');
    vChat.classList.add('fchat-view--hidden');
  } else {
    vList.classList.add('fchat-view--hidden');
    vChat.classList.remove('fchat-view--hidden');
  }
}

export function fchatGoList() {
  stopRealtime();
  _convId = null;
  _currentOtherUser = null;
  showView('list');
  loadConvList();  // refrescar
}

// ── LISTA DE CONVERSACIONES ───────────────────────────────────────────────────
async function loadConvList() {
  _convs = await loadConversations();
  renderConvList(_convs);
  updateBadge(_convs.reduce((s, c) => s + (c.unread_count || 0), 0));
}

function renderConvList(convs) {
  const el = $('fchat-conv-list');
  if (!el) return;
  if (!convs.length) {
    el.innerHTML = `<div class="fchat-empty"><i class="fa fa-comments"></i><p>Sin conversaciones aún</p></div>`;
    return;
  }
  el.innerHTML = convs.map(c => {
    const name    = esc(c.other_user?.full_name || 'Usuario');
    const init    = name[0]?.toUpperCase() || '?';
    const preview = esc(c.last_message_preview || '—');
    const time    = c.last_message_at ? relTime(c.last_message_at) : '';
    const unread  = c.unread_count > 0
      ? `<span class="fchat-unread">${c.unread_count}</span>` : '';
    return `
      <div class="fchat-conv-item" data-id="${c.id}" data-user="${c.other_user?.id||''}" onclick="window.fchatOpenConv('${c.id}','${c.other_user?.id||''}','${name}','${esc(c.job?.description||'')}')">
        <div class="fchat-conv-avatar">${init}</div>
        <div class="fchat-conv-body">
          <div class="fchat-conv-name">${name}</div>
          <div class="fchat-conv-preview">${preview}</div>
        </div>
        <div class="fchat-conv-meta">
          <span class="fchat-conv-time">${time}</span>
          ${unread}
        </div>
      </div>`;
  }).join('');
}

export function fchatSearch(q) {
  document.querySelectorAll('.fchat-conv-item').forEach(el => {
    const name = el.querySelector('.fchat-conv-name')?.textContent.toLowerCase() || '';
    el.style.display = name.includes(q.toLowerCase()) ? '' : 'none';
  });
}

// ── ABRIR CONVERSACIÓN ────────────────────────────────────────────────────────
export async function fchatOpenConv(convId, otherUserId, name, jobDesc) {
  _convId = convId;
  _currentOtherUser = { id: otherUserId, name };

  // Header
  const init = name[0]?.toUpperCase() || '?';
  if ($('fchat-chat-avatar')) $('fchat-chat-avatar').textContent = init;
  if ($('fchat-chat-name'))   $('fchat-chat-name').textContent   = name;
  if ($('fchat-chat-sub'))    $('fchat-chat-sub').textContent    = jobDesc || '';

  showView('chat');
  await refreshMessages();
  startRealtime(convId);
}

// ── ABRIR CHAT CON UN USUARIO (desde botón externo) ───────────────────────────
export async function openFloatChatWith(userId, jobId = null, isPreAcceptance = false) {
  if (!store.currentUser) return;

  // Asegurar que el panel esté abierto
  if (!_open) await openFloatChat();

  // Buscar conversación existente o crear una
  let conv = _convs.find(c => c.other_user?.id === userId);
  if (!conv) {
    const newConv = await createConversation(userId, jobId, isPreAcceptance);
    if (!newConv) return;
    await loadConvList();
    conv = _convs.find(c => c.id === newConv.id) || { id: newConv.id, other_user: { id: userId }, job: null };
  }

  const name = conv.other_user?.full_name || 'Usuario';
  const desc = conv.job?.description || '';
  await fchatOpenConv(conv.id, userId, name, desc);

  // Banner pre-aceptación
  const bannerEl = $('fchat-pre-banner');
  if (bannerEl) {
    if (isPreAcceptance) {
      bannerEl.classList.remove('hidden');
      bannerEl.innerHTML = '<i class="fa fa-info-circle"></i> Chat previo a la aceptación (máx 5 mensajes)';
    } else {
      bannerEl.classList.add('hidden');
    }
  }
}

// ── MENSAJES ──────────────────────────────────────────────────────────────────
async function refreshMessages() {
  if (!_convId) return;
  const msgs = await loadMessages(_convId);
  renderMsgs(msgs);
  // Marcar como leídos
  const sb = getSupabase();
  if (sb && store.currentUser) {
    sb.from('messages')
      .update({ read: true })
      .eq('conversation_id', _convId)
      .neq('sender_id', store.currentUser.id)
      .then(() => updateBadge());
  }
}

function renderMsgs(msgs) {
  const el = $('fchat-messages');
  if (!el) return;
  if (!msgs.length) {
    el.innerHTML = `<div class="fchat-empty" style="height:100%;"><i class="fa fa-comment-slash"></i><p>Sin mensajes aún.<br>¡Escribí el primero!</p></div>`;
    return;
  }

  let html = '';
  let lastDate = '';

  msgs.forEach(m => {
    const isSent = m.sender_id === store.currentUser.id;
    const cls    = isSent ? 'sent' : 'received';
    const d      = new Date(m.created_at);
    const dateStr = d.toLocaleDateString('es-AR', { weekday:'short', day:'numeric', month:'short' });

    if (dateStr !== lastDate) {
      lastDate = dateStr;
      html += `<div class="fchat-date-sep"><span>${dateStr}</span></div>`;
    }

    const time = d.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' });

    if (m.type === 'image' && m.metadata?.url) {
      html += `<div class="msg ${cls}">
        <div class="msg-bubble" style="padding:4px;background:transparent;">
          <img src="${esc(m.metadata.url)}" style="max-width:200px;border-radius:10px;display:block;" loading="lazy">
        </div>
        <div class="msg-meta">${time}</div>
      </div>`;
    } else {
      html += `<div class="msg ${cls}">
        <div class="msg-bubble">${esc(m.content || '')}</div>
        <div class="msg-meta">${time}${isSent ? ' <i class="fa fa-check-double" style="font-size:0.65rem;color:var(--accent);margin-left:2px;"></i>' : ''}</div>
      </div>`;
    }
  });

  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}

export async function fchatSend() {
  const input = $('fchat-input');
  if (!input || !_convId) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  const btn = $('fchat-send-btn');
  if (btn) btn.disabled = true;
  await sendMessage(_convId, text);
  await refreshMessages();
  if (btn) btn.disabled = false;
  input.focus();
}

export function fchatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    fchatSend();
  }
}

export function fchatSendImage() {
  $('fchat-image-input')?.click();
}

// ── REALTIME ──────────────────────────────────────────────────────────────────
function startRealtime(convId) {
  stopRealtime();
  const sb = getSupabase();
  if (!sb) return;
  _realtimeCh = sb.channel(`fchat-${convId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${convId}`
    }, () => {
      refreshMessages();
    })
    .subscribe();
}

function stopRealtime() {
  if (_realtimeCh) {
    getSupabase()?.removeChannel(_realtimeCh);
    _realtimeCh = null;
  }
}

// ── BADGE ─────────────────────────────────────────────────────────────────────
async function updateBadge(total) {
  if (total === undefined) {
    const convs = await loadConversations();
    total = convs.reduce((s, c) => s + (c.unread_count || 0), 0);
  }
  const badge = $('fchat-badge');
  if (!badge) return;
  if (total > 0) {
    badge.textContent = total > 99 ? '99+' : total;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

export { updateBadge as updateFChatBadge };

// ── TIEMPO RELATIVO ───────────────────────────────────────────────────────────
function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d`;
  return new Date(iso).toLocaleDateString('es-AR', { day:'numeric', month:'short' });
}
