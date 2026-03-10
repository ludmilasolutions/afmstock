import { MOCK_PROS } from './config.js';

export const store = {
  currentUser: null,
  currentRole: null,       // 'admin' | null
  currentPro: null,        // registro en tabla professionals (null si no tiene perfil pro)
  activePanel: 'user',     // panel activo: 'user' | 'pro' | 'admin'
  allProfessionals: [],
  allSpecialties: [],
  allAds: [],
  userLocation: null,
  previousPage: 'home',
  activeFilters: { cert: false, dest: false, online: false },
  currentProIdForAction: null,
  selectedPros: [],          // acumula hasta MAX_MULTI_REQUEST selecciones
  MAX_MULTI_REQUEST: 2,
  ratings: { puntualidad: 0, calidad: 0, precio: 0, comunicacion: 0 },
  deferrePrompt: null,
  tourStep: 0,
  tourCompleted: false,

  // Getters computados
  get isPro()   { return !!this.currentPro; },
  get isAdmin() { return this.currentRole === 'admin'; },

  getMockPros() { return MOCK_PROS; },

  setCurrentUser(user)          { this.currentUser = user; },
  setCurrentRole(role)          { this.currentRole = role; },
  setCurrentPro(pro)            { this.currentPro = pro; },
  setActivePanel(panel)         { this.activePanel = panel; },
  setAllProfessionals(pros)     { this.allProfessionals = pros; },
  setAllSpecialties(specialties){ this.allSpecialties = specialties; },
  setAllAds(ads)                { this.allAds = ads; },
  setUserLocation(location)     { this.userLocation = location; },
  setPreviousPage(page)         { this.previousPage = page; },
  setActiveFilters(filters)     { this.activeFilters = filters; },
  toggleFilter(type)            { this.activeFilters[type] = !this.activeFilters[type]; },
  setCurrentProIdForAction(id)  { this.currentProIdForAction = id; },
  setRatings(ratings)           { this.ratings = ratings; },

  reset() {
    this.currentUser = null;
    this.currentRole = null;
    this.currentPro = null;
    this.activePanel = 'user';
    this.previousPage = 'home';
    this.currentProIdForAction = null;
    this.selectedPros = [];
    this.ratings = { puntualidad: 0, calidad: 0, precio: 0, comunicacion: 0 };
  }
};

export function getStore() {
  return store;
}
