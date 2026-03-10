export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function getInitials(name) {
  if (!name) return 'U';
  return name.charAt(0).toUpperCase();
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function formatPhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function generateStars(rating) {
  const rounded = Math.round(rating || 0);
  return Array.from({ length: 5 }, (_, i) => 
    `<i class="fa${i < rounded ? 's' : 'r'} fa-star" style="color:${i < rounded ? 'var(--orange)' : 'var(--gray2)'}"></i>`
  ).join('');
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(amount || 0);
}

export function getStatusLabel(status) {
  const labels = {
    solicitado: 'Solicitado',
    aceptado: 'Aceptado',
    en_proceso: 'En proceso',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado'
  };
  return labels[status] || status;
}

export function getStatusClass(status) {
  const classes = {
    solicitado: 'status-solicitado',
    aceptado: 'status-aceptado',
    en_proceso: 'status-en-proceso',
    finalizado: 'status-finalizado',
    cancelado: 'status-cancelado'
  };
  return classes[status] || '';
}

export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}
