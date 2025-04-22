import { ref, watch, shallowRef, Ref } from 'vue';
import { createClient } from '@supabase/supabase-js'; // Import Supabase client creator

// --- Supabase Client Setup (Lazy Initialization) ---
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (supabase) {
    return supabase;
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
    | string
    | undefined;

  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    return supabase;
  } else {
    // Don't throw error here, let the calling function handle it
    return null;
  }
}
// --- End Supabase Client Setup ---

// --- Timestamp Fetching Types/Functions ---
export interface ActiveTimestamp {
  // Define type locally
  id: string;
  start_time: number;
  end_time: number;
  type: string;
  explanation?: string;
}
const fetchActiveTimestamps = async (
  episodeIdentifier: string,
): Promise<ActiveTimestamp[]> => {
  if (!episodeIdentifier) {
    console.warn('fetchActiveTimestamps: No episodeIdentifier provided.');
    return [];
  }

  const client = getSupabaseClient();
  if (!client) {
    // If Supabase is not configured, return empty array instead of throwing error
    // console.warn('Supabase is not configured. Skipping timestamp fetch.');
    return [];
  }

  try {
    // Add type assertion to the select query
    const { data, error } = await client
      .from('active_timestamps')
      .select<string, ActiveTimestamp>(
        'id, start_time, end_time, type, explanation',
      )
      .eq('episode_identifier', episodeIdentifier);
    if (error) {
      console.error(
        `Error fetching active timestamps for '${episodeIdentifier}':`,
        error.message,
      );
      // Return empty array on fetch error to avoid breaking the UI
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error(
      `Unexpected error fetching active timestamps for '${episodeIdentifier}':`,
      err,
    );
    // Return empty array on unexpected error
    return [];
  }
};
// --- End Timestamp Fetching ---

// Simple reactive state management for the fetched timestamps
export function useSupabaseTimestamps(episodeIdentifier: Ref<string | null>) {
  const isLoading = ref(false);
  const error = shallowRef<Error | null>(null); // Use shallowRef for errors
  const data = shallowRef<ActiveTimestamp[] | null>(null); // Use shallowRef for data array

  const execute = async (identifier: string | null) => {
    if (!identifier) {
      // If identifier is null/empty, clear data and stop
      data.value = [];
      error.value = null;
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    error.value = null;
    // console.log(`Fetching timestamps for: ${identifier}`);

    try {
      const result = await fetchActiveTimestamps(identifier);
      // fetchActiveTimestamps now always returns an array (empty on error/missing config)
      data.value = result;
      // console.log(`Successfully fetched ${result.length} timestamps.`);
    } catch (err: any) {
      console.error('Error in useSupabaseTimestamps:', err);
      error.value = err;
      data.value = []; // Clear data to empty array on error
    } finally {
      isLoading.value = false;
    }
  };

  // Watch for changes in the episode identifier and re-fetch
  watch(
    episodeIdentifier,
    (newIdentifier) => {
      execute(newIdentifier);
    },
    { immediate: true }, // Fetch immediately when the composable is used
  );

  // Function to manually refetch if needed
  const refetch = () => {
    execute(episodeIdentifier.value);
  };

  return {
    isLoading,
    error,
    data,
    refetch,
  };
}
