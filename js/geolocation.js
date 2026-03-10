import { store } from './store.js';
import { showToast } from './ui.js';

export function detectLocation() {
  if (!navigator.geolocation) {
    showToast('Tu navegador no soporta geolocalización', 'error');
    return;
  }
  
  showToast('Detectando ubicación...', 'info');
  
  navigator.geolocation.getCurrentPosition(
    position => {
      store.setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
      showToast('Ubicación detectada correctamente', 'success');
    },
    error => {
      if (error.code === 1) {
        // Usuario denegó el permiso - no mostrar error
        return;
      }
      showToast('No se pudo detectar la ubicación', 'error');
      console.warn('Geolocation error:', error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

export function getUserLocation() {
  return store.userLocation;
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

export function sortByDistance(pros, userLocation) {
  if (!userLocation) return pros;
  
  return [...pros].sort((a, b) => {
    const distA = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      a.lat || 0,
      a.lng || 0
    );
    const distB = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      b.lat || 0,
      b.lng || 0
    );
    return distA - distB;
  });
}

export function filterByDistance(pros, maxDistance, userLocation) {
  if (!userLocation || !maxDistance) return pros;
  
  return pros.filter(p => {
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      p.lat || 0,
      p.lng || 0
    );
    return distance <= maxDistance;
  });
}
