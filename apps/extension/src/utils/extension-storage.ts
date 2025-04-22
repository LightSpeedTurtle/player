import { IPlayerStorage } from '@anime-skip/player';

// Define MaybePromise locally
type MaybePromise<T> = T | Promise<T>;

// Only export the local browser storage implementation
export function createExtensionPlayerStorage(): IPlayerStorage {
  const getKey = (key: string) => `local:${key}`;
  return {
    getItem(key) {
      return storage.getItem(getKey(key));
    },
    removeItem(key) {
      return storage.removeItem(getKey(key));
    },
    clear() {
      return browser.storage.local.clear();
    },
    setItem(key, value) {
      return storage.setItem(getKey(key), value);
    },
  };
}
