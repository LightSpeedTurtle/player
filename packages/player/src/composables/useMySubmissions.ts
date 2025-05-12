import { ref, watch, shallowRef, computed } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import type { MySubmission } from '../types/MySubmission';
import { useEpisodeIdentifier } from './useEpisodeIdentifier';
import { useSessionUserInfo } from './useSessionUserInfo';

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

  // API endpoint for Google Sheets
  const GOOGLE_SHEET_API_URL =
    'https://script.google.com/macros/s/AKfycbwdbg4IqRtlH2uq5FEaQJIdJqkkZIcNk9tGXrWWqugLXGU6n7SnWrL9ozK1NMxhuaFI/exec';

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
   * Main function to fetch and process submissions
   * @param identifier Episode identifier string
   */
  const execute = async (identifier: string | null) => {
    console.log('[useMySubmissions][execute] Starting execution', {
      identifier,
      userPhone: userInfo.value?.phone,
      episodeData: episodeData?.value,
      testMode: isTestMode.value,
    });

    // If no identifier provided, return empty results
    if (!identifier && !isTestMode.value) {
      console.log(
        '[useMySubmissions] No identifier provided, returning empty results',
      );
      data.value = [];
      error.value = null;
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // Fetch data from Google Sheets
      const response = await fetch(GOOGLE_SHEET_API_URL);
      if (!response.ok) throw new Error('Failed to fetch Google Sheet data');
      const sheetData = await response.json();
      console.log('[useMySubmissions] Successfully fetched sheet data');

      // Helper function to parse time strings into seconds
      function parseTime(str: any): number {
        if (!str) return 0;
        const parts = String(str).split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3)
          return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return Number(str) || 0;
      }

      /**
       * Extract season and episode numbers from a string
       * Handles multiple formats: "Season 1 Episode 2", "S1E2", "S1 E2", "1 2"
       */
      function extractSeasonEpisode(seasonEpisodeStr: string): {
        season: string | null;
        episode: string | null;
      } {
        seasonEpisodeStr = seasonEpisodeStr.toLowerCase();
        // Try to match common patterns first
        const regex =
          /season\s*(\d+)\s*(special\s*)?episode\s*(\d+)|s(\d+)\s*e(\d+)|s(\d+)e(\d+)/i;
        const match = seasonEpisodeStr.match(regex);

        let seasonMatch = null;
        let episodeMatch = null;

        if (match) {
          seasonMatch = match[1] || match[4] || match[6];
          episodeMatch = match[3] || match[5] || match[7];
        }

        // Fallback: try to extract two numbers
        if (!seasonMatch || !episodeMatch) {
          const numbers = seasonEpisodeStr.match(/\d+/g);
          if (numbers && numbers.length >= 2) {
            seasonMatch = numbers[0];
            episodeMatch = numbers[1];
          }
        }

        return {
          season: seasonMatch ? String(seasonMatch) : null,
          episode: episodeMatch ? String(episodeMatch) : null,
        };
      }

      let mappedSubmissions: MySubmission[] = [];
      let processedRowCount = 0;
      let filteredRowCount = 0;

      // Process array-format data (most common format)
      if (Array.isArray(sheetData) && Array.isArray(sheetData[0])) {
        console.log('[useMySubmissions] Processing array-format sheet data');

        // Skip header row
        const rows = sheetData.slice(1);
        processedRowCount = rows.length;

        // Filter and map rows to MySubmission objects
        mappedSubmissions = rows
          .filter((row: any[]) => {
            // In test mode, only filter for valid timestamps
            if (isTestMode.value) {
              const hasValidTimes = row[7] && row[8];
              return hasValidTimes;
            }

            // --- 1. User Phone Filter ---
            const userPhone = String(userInfo?.value?.phone || '').replace(
              /\D/g,
              '',
            );
            const rowPhone = String(row[4] || '').replace(/\D/g, '');

            if (!userPhone || !rowPhone || userPhone !== rowPhone) {
              return false;
            }

            // --- 2. Show Name Filter ---
            const filterShow = String(episodeData?.value?.showName || '')
              .trim()
              .toLowerCase();
            const rowShow = String(row[5] || '')
              .trim()
              .toLowerCase();

            if (!filterShow || !rowShow || rowShow !== filterShow) {
              return false;
            }

            // --- 3. Season/Episode Filter ---
            const filterSeason = String(
              episodeData?.value?.season || '',
            ).trim();
            const filterEpisode = String(
              episodeData?.value?.number || '',
            ).trim();
            const rowSeasonEpisode = String(row[6] || '');

            if (!filterSeason || !filterEpisode || !rowSeasonEpisode) {
              return false;
            }

            // Extract and compare season/episode
            const { season: rowSeason, episode: rowEpisode } =
              extractSeasonEpisode(rowSeasonEpisode);
            if (
              !rowSeason ||
              !rowEpisode ||
              rowSeason !== filterSeason ||
              rowEpisode !== filterEpisode
            ) {
              return false;
            }

            // --- 4. Check for valid timestamps ---
            if (!row[7] || !row[8]) {
              return false;
            }

            // Row passed all filters
            filteredRowCount++;
            return true;
          })
          .map((row: any[], idx: number) => {
            // Parse time values
            const startRaw = row[7] || '';
            const endRaw = row[8] || '';
            const startSeconds = parseTime(startRaw);
            const endSeconds = parseTime(endRaw);

            // Create submission object
            return {
              id: row[0] || `submission-${idx}`,
              start_time: startRaw,
              start_seconds: startSeconds,
              end_time: endRaw,
              end_seconds: endSeconds,
              type: String(row[9] || ''),
              explanation: row[10] || '',
              state: '', // No explicit Status column in this format
              submitted_at: row[0] || '',
              show_name: row[5] || '',
              season_episode: row[6] || '',
              edit_link: row[19] || '', // Column T (index 19)
            } as MySubmission;
          });
      } else if (Array.isArray(sheetData)) {
        // Process object-format data (alternative format)
        console.log('[useMySubmissions] Processing object-format sheet data');
        processedRowCount = sheetData.length;

        mappedSubmissions = (sheetData as any[])
          .filter((row) => {
            // Check for valid timestamps first
            const startRaw = row['Scene Start Time'] || '';
            const endRaw = row['Scene End Time'] || '';
            if (!startRaw || !endRaw) return false;

            // In test mode, only filter for valid timestamps
            if (isTestMode.value) {
              return true;
            }

            // --- 1. User Phone Filter ---
            const userPhone = String(userInfo?.value?.phone || '').replace(
              /\D/g,
              '',
            );
            const rowPhone = String(row['Phone Number'] || '').replace(
              /\D/g,
              '',
            );
            if (!userPhone || !rowPhone || rowPhone !== userPhone) {
              return false;
            }

            // --- 2. Show Name Filter ---
            if (episodeData?.value?.showName) {
              const rowShow = String(row['Show Name (Full)'] || '')
                .trim()
                .toLowerCase();
              const targetShow = String(episodeData.value.showName)
                .trim()
                .toLowerCase();
              if (!rowShow || rowShow !== targetShow) {
                return false;
              }
            } else {
              return false;
            }

            // --- 3. Season/Episode Filter ---
            const filterSeason = String(
              episodeData?.value?.season || '',
            ).trim();
            const filterEpisode = String(
              episodeData?.value?.number || '',
            ).trim();
            if (!filterSeason || !filterEpisode) {
              return false;
            }

            // Find the season/episode field (may have different key names)
            const seasonEpisodeKey = Object.keys(row).find((k) => {
              const key = k.toLowerCase();
              return key.includes('season') && key.includes('episode');
            });

            if (!seasonEpisodeKey || !row[seasonEpisodeKey]) {
              return false;
            }

            // Extract and match season/episode
            const { season: rowSeason, episode: rowEpisode } =
              extractSeasonEpisode(String(row[seasonEpisodeKey]));
            if (
              !rowSeason ||
              !rowEpisode ||
              rowSeason !== filterSeason ||
              rowEpisode !== filterEpisode
            ) {
              return false;
            }

            // Row passed all filters
            filteredRowCount++;
            return true;
          })
          .map((row, idx) => {
            // Parse time values
            const startRaw = row['Scene Start Time'] || '';
            const endRaw = row['Scene End Time'] || '';
            const startSeconds = parseTime(startRaw);
            const endSeconds = parseTime(endRaw);

            // Create submission object
            return {
              id: row['Timestamp ID'] || `obj-submission-${idx}`,
              start_time: startRaw,
              start_seconds: startSeconds,
              end_time: endRaw,
              end_seconds: endSeconds,
              type: String(row['Type of Content'] || ''),
              explanation:
                row['Did anything important to the plot happen'] || '',
              state: row['Status'] || '',
              submitted_at: row['Timestamp Submitted'] || '',
              show_name: row['Show Name (Full)'] || '',
              season_episode: row['Season and Episode'] || '',
              edit_link: row['Edit Link'] || '',
            } as MySubmission;
          });
      }
      // Add summary logging for debugging
      console.log(`[useMySubmissions] Data processing complete:`, {
        processedRows: processedRowCount,
        filteredRows: filteredRowCount,
        finalSubmissions: mappedSubmissions.length,
        testMode: isTestMode.value,
      });

      // Sort submissions by start time for better display order
      mappedSubmissions.sort((a, b) => a.start_seconds - b.start_seconds);

      // Update reactive state
      data.value = mappedSubmissions;
    } catch (err: any) {
      console.error(
        '[useMySubmissions] Error fetching or processing data:',
        err,
      );
      error.value = err;
      data.value = [];
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
