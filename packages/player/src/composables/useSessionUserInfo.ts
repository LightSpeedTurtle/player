import { ref, watch } from 'vue';
import { SESSION_USER_INFO_KEY } from '../constants';

export interface SessionUserInfo {
  firstName: string;
  phone: string;
}

const userInfo = ref<SessionUserInfo | null>(null);

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function loadUserInfo(): SessionUserInfo | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(SESSION_USER_INFO_KEY);
  if (!raw || raw === 'null' || raw === '{}') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveUserInfo(info: SessionUserInfo) {
  userInfo.value = info;
  if (isBrowser()) {
    localStorage.setItem(SESSION_USER_INFO_KEY, JSON.stringify(info));
  }
}

function clearUserInfo() {
  userInfo.value = null;
  if (isBrowser()) {
    localStorage.removeItem(SESSION_USER_INFO_KEY);
  }
}

// Initialize from localStorage only in browser
if (isBrowser()) {
  userInfo.value = loadUserInfo();
  // Watch for changes and sync to localStorage
  watch(
    userInfo,
    (val) => {
      if (val) {
        localStorage.setItem(SESSION_USER_INFO_KEY, JSON.stringify(val));
      } else {
        localStorage.removeItem(SESSION_USER_INFO_KEY);
      }
    },
    { deep: true },
  );
}

export function useSessionUserInfo() {
  return {
    userInfo,
    saveUserInfo,
    clearUserInfo,
    loadUserInfo,
  };
}
