import { ref, watch, shallowRef } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import type { MySubmission } from '../types/MySubmission';
import { useEpisodeIdentifier } from './useEpisodeIdentifier';
import { useSessionUserInfo } from './useSessionUserInfo';

// Define types for the Google Sheets API response
interface SubmissionRow {
  Timestamp?: string;
  'Email Address'?: string;
  'Show or Movie?'?: string;
  'First Name'?: string;
  'Phone Number'?: string;
  'Show/Movie Name (Full)'?: string;
  'Season and Episode'?: string;
  'Scene Start Time'?: string;
  'Scene End Time'?: string;
  'Type of Content'?: string;
  'Did anything important to the plot happen in this scene? If so, please describe it (spare us any explicit details or language though). If not, leave this blank'?: string;
  Status?: string;
  'Crunchyroll Link'?: string;
  'Hianime Link'?: string;
  'Animepahe Link'?: string;
  '9Anime Link'?: string;
  'Netflix Link'?: string;
  'Edit Link'?: string;
  'Response ID'?: string;
  'Crunchyroll ID'?: string;
  'Hianime ID'?: string;
  'Animepahe ID'?: string;
  '9Anime ID'?: string;
  'Netflix ID'?: string;
}

/**
 * Custom composable to fetch and filter user submissions from Google Sheets
 * @param options Configuration options for the composable
 * @returns Reactive state and methods for submission data
 */
export function useMySubmissions({
  episodeData,
  testMode = false, // Add test mode flag to bypass filters for debugging
}: {
  episodeData?: Ref<{ showName: string; season: string; number: string }>;
  testMode?: boolean;
} = {}): {
  isLoading: Ref<boolean>;
  error: ShallowRef<Error | null>;
  data: ShallowRef<MySubmission[] | null>;
  refetch: () => void;
  toggleTestMode: () => void; // Add method to toggle test mode
} {
  // Use composable for user info
  const { userInfo } = useSessionUserInfo();

  // State variables
  const isLoading = ref(false);
  const error = shallowRef<Error | null>(null);
  const data = shallowRef<MySubmission[] | null>(null);
  const isTestMode = ref(testMode);

  // Get episode identifier from composable
  const { identifier: episodeIdentifier } = useEpisodeIdentifier();

  // API endpoint for Google Sheets with new server-side filtering
  const GOOGLE_SHEET_API_URL =
    'https://script.google.com/macros/s/AKfycbyWSyat6E7Fnx359yhUDsvIYnFHy2InFlNCY68SgCX-fO62mP-Ui5cD1NbuhD2RmhDD/exec';

  // Maximum number of retries for failed requests
  const MAX_RETRIES = 3;
  // Base delay between retries in ms
  const RETRY_DELAY = 1000;

  // Toggle function for test mode
  const toggleTestMode = () => {
    isTestMode.value = !isTestMode.value;
    console.log(
      `[useMySubmissions] Test mode ${
        isTestMode.value ? 'enabled' : 'disabled'
      }`,
    );
    // Refetch data with new test mode setting
    execute(episodeIdentifier.value);
  };

  /**
   * Watch for changes in relevant dependencies and trigger data refresh
   */
  watch(
    [
      () => userInfo.value && JSON.stringify(userInfo.value),
      () => episodeData && JSON.stringify(episodeData.value),
      episodeIdentifier,
      isTestMode, // Watch for test mode changes too
    ],
    () => {
      console.log('[useMySubmissions][watch] Dependencies changed', {
        userPhone: userInfo.value?.phone,
        episodeData: episodeData?.value,
        episodeId: episodeIdentifier.value,
        testMode: isTestMode.value,
      });

      // In test mode, execute regardless of episode data
      if (isTestMode.value) {
        console.log(
          '[useMySubmissions] Running in TEST MODE - bypassing validation checks',
        );
        execute(episodeIdentifier.value);
        return;
      }

      // In normal mode, only execute if all required episode info is present
      const hasValidEpisodeData =
        !!episodeData &&
        typeof episodeData.value?.showName === 'string' &&
        episodeData.value.showName.trim() !== '' &&
        typeof episodeData.value?.season === 'string' &&
        episodeData.value.season.trim() !== '' &&
        typeof episodeData.value?.number === 'string' &&
        episodeData.value.number.trim() !== '';

      if (hasValidEpisodeData) {
        execute(episodeIdentifier.value);
      } else {
        console.log(
          '[useMySubmissions] Incomplete episode data, waiting for data',
        );
        data.value = null;
        error.value = null;
        isLoading.value = true;
      }
    },
    { immediate: true },
  );

  /**
   * Helper function to parse time strings into seconds
   */
  function parseTime(str: any): number {
    if (!str) return 0;
    const parts = String(str).split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return Number(str) || 0;
  }

  /**
   * Fetches data from the Google Sheets API with retry logic
   */
  async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = MAX_RETRIES,
  ): Promise<Response> {
    let lastError: Error;

    // Prepare options, removing Content-Type for GET requests
    const fetchOptions = { ...options };
    if (fetchOptions.method === 'GET' || !fetchOptions.method) {
      if (
        fetchOptions.headers &&
        (fetchOptions.headers as Record<string, string>)['Content-Type']
      ) {
        delete (fetchOptions.headers as Record<string, string>)['Content-Type'];
      }
    }

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, fetchOptions); // Use modified fetchOptions
        if (response.ok) return response;

        const error = new Error(`HTTP error! status: ${response.status}`);
        (error as any).status = response.status;
        throw error;
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          // Wait for an increasing delay before retrying (exponential backoff)
          const delay = RETRY_DELAY * Math.pow(2, i);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Unknown error occurred during fetch');
  }

  /**
   * Transforms a SubmissionRow from the API into a MySubmission
   */
  function transformSubmission(row: SubmissionRow): MySubmission {
    return {
      id: row['Response ID'] || '', // Use Response ID as primary, ensure it's a string or number as per MySubmission type
      start_time: row['Scene Start Time'] || '',
      start_seconds: parseTime(row['Scene Start Time']),
      end_time: row['Scene End Time'] || '',
      end_seconds: parseTime(row['Scene End Time']),
      type: row['Type of Content'] || '',
      explanation:
        row[
          'Did anything important to the plot happen in this scene? If so, please describe it (spare us any explicit details or language though). If not, leave this blank'
        ] || '',
      state: row.Status || '', // Will map to 'Pending', 'Approved', etc.
      submitted_at: row.Timestamp || '', // Form submission time
      show_name: row['Show/Movie Name (Full)'] || '',
      season_episode: row['Season and Episode'] || '',
      edit_link: row['Edit Link'] || '',
    };
  }

  /**
   * Main function to fetch and process submissions
   * @param identifier Episode identifier string (Crunchyroll ID)
   */
  const execute = async (identifier: string | null) => {
    console.log('[useMySubmissions][execute] Starting execution', {
      identifier,
      userPhone: userInfo.value?.phone,
      episodeData: episodeData?.value,
      testMode: isTestMode.value,
    });

    // In normal mode, require an identifier
    if (!isTestMode.value && !identifier) {
      console.log(
        '[useMySubmissions] No identifier provided in normal mode, returning empty results',
      );
      data.value = [];
      error.value = null;
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // Build the URL with query parameters
      const url = new URL(GOOGLE_SHEET_API_URL);

      if (isTestMode.value) {
        // In test mode, just add testMode parameter
        url.searchParams.append('testMode', 'true');
      } else {
        // In normal mode, add userPhone and identifier
        if (userInfo.value?.phone) {
          url.searchParams.append('userPhone', userInfo.value.phone);
        }
        if (identifier) {
          url.searchParams.append('identifier', identifier);
        }
      }

      // Add cache buster to prevent caching
      url.searchParams.append('_', Date.now().toString());

      console.log('[useMySubmissions] Fetching data from:', url.toString());

      // Fetch data from Google Sheets with retry logic
      const response = await fetchWithRetry(url.toString(), {
        method: 'GET',
        // headers: { // Content-Type header removed for GET
        //   'Content-Type': 'application/json',
        // },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch Google Sheet data: ${response.status} ${response.statusText}`,
        );
      }

      const sheetData = (await response.json()) as SubmissionRow[];
      console.log(
        `[useMySubmissions] Successfully fetched ${sheetData.length} submissions`,
      );

      // Transform the data to match MySubmission type
      const mappedSubmissions = sheetData.map(transformSubmission);

      // Update the reactive state
      data.value = mappedSubmissions;
      error.value = null;
    } catch (err) {
      console.error('[useMySubmissions] Error fetching submissions:', err);
      error.value =
        err instanceof Error ? err : new Error('Unknown error occurred');
      data.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  // Watch for changes in episode identifier and re-fetch
  watch(
    episodeIdentifier,
    (newIdentifier) => {
      console.log(
        '[useMySubmissions] episodeIdentifier changed:',
        newIdentifier,
      );
      execute(newIdentifier);
    },
    { immediate: true },
  );

  // Watch for changes in episodeData and re-fetch if relevant fields change
  if (episodeData && typeof episodeData === 'object') {
    watch(
      () => ({
        showName: episodeData.value?.showName,
        season: episodeData.value?.season,
        number: episodeData.value?.number,
      }),
      (newVal, oldVal) => {
        if (
          newVal.showName &&
          newVal.season &&
          newVal.number &&
          JSON.stringify(newVal) !== JSON.stringify(oldVal)
        ) {
          console.log('[useMySubmissions] episodeData changed:', newVal);
          execute(episodeIdentifier.value);
        }
      },
      { immediate: false, deep: true },
    );
  }

  // Function to manually refetch data
  const refetch = () => {
    console.log('[useMySubmissions] Manual refetch requested');
    execute(episodeIdentifier.value);
  };

  // Return composable state and methods
  return {
    isLoading,
    error,
    data,
    refetch,
    toggleTestMode, // Include the toggleTestMode function to fix the lint error
  };
}
