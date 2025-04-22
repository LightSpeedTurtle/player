import { ref, watch, shallowRef, Ref, computed } from 'vue';
import { createClient, User } from '@supabase/supabase-js'; // Import User type directly from supabase library
import { useEpisodeIdentifier } from './useEpisodeIdentifier'; // Corrected path if needed, assuming it's in the same directory
// If useEpisodeIdentifier is NOT in the same directory, adjust the path accordingly.
// For example, if it's one level up: import { useEpisodeIdentifier } from '../useEpisodeIdentifier';

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

// --- Submission Type ---
interface MySubmission {
  // Define type locally
  id: string;
  start_time: number;
  end_time: number;
  type: string;
  explanation?: string;
  state: string;
  submitted_at: string;
}
// --- End Submission Type ---

// --- Auth Helper (Copied from utils/supabase.ts, needed for currentUser ref) ---
const getCurrentUser = async (): Promise<User | null> => {
  const client = getSupabaseClient();
  if (!client) {
    // console.warn('Supabase not configured. Cannot get current user.');
    return null; // Return null if Supabase isn't configured
  }
  try {
    const {
      data: { session },
      error,
    } = await client.auth.getSession();
    if (error) {
      console.error('Error getting Supabase session:', error.message);
      return null;
    }
    return session?.user ?? null;
  } catch (err) {
    console.error('Unexpected error getting Supabase session:', err);
    return null;
  }
};
// --- End Auth Helper ---

// Reactive state management for the user's submissions
export function useMySubmissions() {
  const isLoading = ref(false);
  const error = shallowRef<Error | null>(null);
  const data = shallowRef<MySubmission[] | null>(null);
  const currentUser = ref<User | null>(null); // Store current user

  const { identifier: episodeIdentifier } = useEpisodeIdentifier();

  // Fetch current user initially
  getCurrentUser().then((user) => {
    currentUser.value = user;
  });
  // TODO: Listen to auth changes to update currentUser if needed (e.g., using onAuthStateChange)

  // Renamed userId parameter as it's fetched internally now via auth.uid() in the RPC function
  const execute = async (identifier: string | null) => {
    // Check for identifier only; RPC function checks auth internally
    if (!identifier) {
      data.value = [];
      error.value = null;
      isLoading.value = false;
      // console.log('useMySubmissions: Skipping fetch - no identifier.');
      return;
    }

    isLoading.value = true;
    error.value = null;
    // console.log(`useMySubmissions: Calling RPC for episode ${identifier}`);

    const client = getSupabaseClient();
    if (!client) {
      // console.warn('Supabase not configured. Skipping submission fetch.');
      data.value = []; // Set empty data if not configured
      error.value = null;
      isLoading.value = false;
      return;
    }

    try {
      // Call the RPC function using the lazy client
      const { data: result, error: rpcError } = await client.rpc(
        'get_my_submissions',
        { episode_id_param: identifier }, // Pass parameter to function
      );

      if (rpcError) {
        // Handle RPC errors
        throw rpcError; // Let the catch block handle it
      }

      // Assuming the structure returned by RPC matches MySubmission.
      // Add type assertion for clarity if needed, though 'as' is used below.
      data.value = (result as MySubmission[]) || []; // Assign data or empty array
      // console.log(`useMySubmissions: RPC returned ${data.value.length} submissions.`);
    } catch (err: any) {
      console.error('Error in useMySubmissions:', err);
      error.value = err;
      data.value = []; // Clear data to empty array on error
    } finally {
      isLoading.value = false;
    }
  };

  // Watch for changes in episode identifier or user ID and re-fetch
  watch(
    [episodeIdentifier, currentUser], // Watch both identifier and user
    ([newIdentifier, newUser]) => {
      // Only need to pass identifier now, RPC handles user ID
      execute(newIdentifier);
    },
    { immediate: true }, // Fetch immediately when the composable is used
    // deep: true might be needed if user object structure is complex and changes internally
  );

  // Function to manually refetch
  const refetch = () => {
    // Only need to pass identifier now
    execute(episodeIdentifier.value);
  };

  return {
    isLoading,
    error,
    data,
    refetch,
  };
}
