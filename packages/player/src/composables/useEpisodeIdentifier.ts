import { ref, readonly } from 'vue';

// Singleton state for the current episode identifier (e.g., transformed URL)
const currentEpisodeIdentifier = ref<string | null>(null);

export function useEpisodeIdentifier() {
  // Provide read-only access to prevent accidental modification outside the setter
  const identifier = readonly(currentEpisodeIdentifier);

  const setIdentifier = (newIdentifier: string | null) => {
    // console.log(`Setting episode identifier: ${newIdentifier}`);
    currentEpisodeIdentifier.value = newIdentifier;
  };

  return {
    identifier,
    setIdentifier,
  };
}
