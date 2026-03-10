import { CONFIG } from './config.js';

let sbInstance = null;

function waitForSupabase(maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      if (window.supabase && window.supabase.createClient) {
        resolve(window.supabase);
      } else if (attempts >= maxAttempts) {
        reject(new Error('Supabase library not loaded'));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

export async function initSupabase() {
  if (sbInstance) return sbInstance;
  
  try {
    const supabaseLib = await waitForSupabase();
    const { createClient } = supabaseLib;
    sbInstance = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    return sbInstance;
  } catch (e) {
    console.error('Error loading Supabase:', e);
    throw e;
  }
}

export function getSupabase() {
  return sbInstance;
}

export async function getSession() {
  if (!sbInstance) await initSupabase();
  return await sbInstance.auth.getSession();
}

export async function onAuthStateChange(callback) {
  if (!sbInstance) await initSupabase();
  return sbInstance.auth.onAuthStateChange(callback);
}

export const sb = {
  get auth() {
    return sbInstance?.auth;
  },
  from(table) {
    return sbInstance?.from(table);
  },
  channel(name) {
    return sbInstance?.channel(name);
  }
};
