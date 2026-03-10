import { store } from './store.js';
import { showToast, closeModal } from './ui.js';

const TOUR_STEPS = [
  {
    title: '¡Bienvenido a TECNIYA!',
    content: `<div style="font-size:4rem;margin-bottom:20px;">👋</div>
    <p style="color:var(--gray);margin-bottom:20px;">La plataforma que te conecta con profesionales técnicos de confianza en tu zona.</p>`,
    highlight: null
  },
  {
    title: 'Encontrá tu profesional',
    content: `<div style="font-size:3rem;margin-bottom:20px;">🔍</div>
    <p style="color:var(--gray);margin-bottom:12px;">Buscá por especialidad, ciudad, zona o disponibilidad.</p>
    <p style="color:var(--gray);font-size:0.85rem;">Ej: "Electricista en Palermo" o "Plomero disponible ahora"</p>`,
    highlight: 'search-section'
  },
  {
    title: 'Contactá directamente',
    content: `<div style="font-size:3rem;margin-bottom:20px;">💬</div>
    <p style="color:var(--gray);margin-bottom:12px;">Chateá con los profesionales, pedí presupuestos y coordiná el trabajo.</p>
    <p style="color:var(--gray);font-size:0.85rem;">Todo queda registrado para tu seguridad.</p>`,
    highlight: null
  },
  {
    title: 'Calificá tu experiencia',
    content: `<div style="font-size:3rem;margin-bottom:20px;">⭐</div>
    <p style="color:var(--gray);margin-bottom:12px;">Una vez terminado el trabajo, calificá al profesional.</p>
    <p style="color:var(--gray);font-size:0.85rem;">Ayudás a la comunidad a crecer con reseñas honestas.</p>`,
    highlight: null
  },
  {
    title: '¡Listo para empezar!',
    content: `<div style="font-size:4rem;margin-bottom:20px;">🚀</div>
    <p style="color:var(--gray);margin-bottom:16px;">¿Tenés algún problema técnico? Encontrá al profesional ideal ahora.</p>
    <button class="btn btn-primary" onclick="window.closeTour();window.showPage('professionals-list');">
      <i class="fa fa-search"></i> Buscar profesionales
    </button>`,
    highlight: null
  }
];

let tourHighlightEl = null;

export function showTour() {
  if (store.tourCompleted) return;
  
  store.tourStep = 0;
  renderTourStep();
  
  const modal = document.getElementById('modal-tour');
  if (modal) modal.classList.add('open');
}

export function renderTourStep() {
  const step = TOUR_STEPS[store.tourStep];
  if (!step) return;
  
  const contentEl = document.getElementById('tour-content');
  const dotsEl = document.getElementById('tour-dots');
  const nextBtn = document.getElementById('btn-next-tour');
  
  if (contentEl) {
    contentEl.innerHTML = `
      <h3 style="margin-bottom:16px;">${step.title}</h3>
      ${step.content}
    `;
  }
  
  if (dotsEl) {
    dotsEl.innerHTML = TOUR_STEPS.map((_, i) => 
      `<span style="width:8px;height:8px;border-radius:50%;background:${i === store.tourStep ? 'var(--accent)' : 'var(--border)'};display:inline-block;"></span>`
    ).join('');
  }
  
  if (nextBtn) {
    if (store.tourStep === TOUR_STEPS.length - 1) {
      nextBtn.style.display = 'none';
    } else {
      nextBtn.style.display = 'block';
      nextBtn.textContent = store.tourStep === TOUR_STEPS.length - 2 ? '¡Empezar!' : 'Siguiente';
    }
  }
  
  // Resaltar elemento
  if (tourHighlightEl) {
    tourHighlightEl.style.position = 'relative';
    tourHighlightEl.style.zIndex = '';
    tourHighlightEl.style.boxShadow = '';
  }
  
  if (step.highlight) {
    tourHighlightEl = document.getElementById(step.highlight);
    if (tourHighlightEl) {
      tourHighlightEl.style.position = 'relative';
      tourHighlightEl.style.zIndex = '100';
      tourHighlightEl.style.boxShadow = '0 0 0 4px var(--accent), 0 0 20px rgba(79, 70, 229, 0.3)';
    }
  }
}

export function nextTourStep() {
  if (store.tourStep < TOUR_STEPS.length - 1) {
    store.tourStep++;
    renderTourStep();
  }
}

export function closeTour() {
  if (tourHighlightEl) {
    tourHighlightEl.style.position = '';
    tourHighlightEl.style.zIndex = '';
    tourHighlightEl.style.boxShadow = '';
  }
  
  store.tourCompleted = true;
  localStorage.setItem('tecniya_tour_done', 'true');
  
  closeModal('modal-tour');
}

export function checkAndShowTour() {
  const tourDone = localStorage.getItem('tecniya_tour_done');
  if (!tourDone && !store.tourCompleted) {
    setTimeout(() => showTour(), 2000);
  }
}

export function resetTour() {
  localStorage.removeItem('tecniya_tour_done');
  store.tourCompleted = false;
  store.tourStep = 0;
}

window.showTour = showTour;
window.nextTourStep = nextTourStep;
window.closeTour = closeTour;
window.resetTour = resetTour;
