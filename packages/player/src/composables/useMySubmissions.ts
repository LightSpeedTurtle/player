import { ref, watch, shallowRef } from 'vue';
import { SESSION_USER_INFO_KEY } from '../constants';

import type { MySubmission } from '../types/MySubmission';

// Reactive state management for the user's submissions
import { useEpisodeIdentifier } from './useEpisodeIdentifier';

// Accept userInfo as an argument for filtering
import type { Ref, ShallowRef } from 'vue';
import { isNullableType } from 'graphql';

import { useSessionUserInfo } from './useSessionUserInfo';

export function useMySubmissions({
  episodeData,
}: {
  episodeData?: Ref<{ showName: string; season: string; number: string }>;
} = {}): {
  isLoading: Ref<boolean>;
  error: ShallowRef<Error | null>;
  data: ShallowRef<MySubmission[] | null>;
  refetch: () => void;
} {
  // Use composable for user info
  const { userInfo } = useSessionUserInfo();
  // ...rest of the logic should use userInfo.value
  // (Assume the rest of the function is correct and only uses userInfo)

  const isLoading = ref(false);
  const error = shallowRef<Error | null>(null);
  const data = shallowRef<MySubmission[] | null>(null);

  const { identifier: episodeIdentifier } = useEpisodeIdentifier();

  const GOOGLE_SHEET_API_URL =
    'https://script.google.com/macros/s/AKfycbwdbg4IqRtlH2uq5FEaQJIdJqkkZIcNk9tGXrWWqugLXGU6n7SnWrL9ozK1NMxhuaFI/exec';

  // Watch for changes in userInfo or episodeData and refetch
  watch(
    [
      () => userInfo.value && JSON.stringify(userInfo.value),
      () => episodeData && JSON.stringify(episodeData.value),
      episodeIdentifier,
    ],
    () => {
      console.log('[DEBUG][watch] fired', {
        userInfo: userInfo.value,
        episodeData: episodeData?.value,
        episodeIdentifier: episodeIdentifier.value,
      });
      // Only execute if all required episode info is present
      if (
        episodeData &&
        typeof episodeData.value?.showName === 'string' &&
        episodeData.value.showName.trim() !== '' &&
        typeof episodeData.value?.season === 'string' &&
        episodeData.value.season.trim() !== '' &&
        typeof episodeData.value?.number === 'string' &&
        episodeData.value.number.trim() !== ''
      ) {
        execute(episodeIdentifier.value);
      } else {
        // Still loading or missing info; keep loading state
        data.value = null;
        error.value = null;
        isLoading.value = true;
      }
    },
    { immediate: true },
  );

  const execute = async (identifier: string | null) => {
    console.log('[DEBUG][execute] called with', {
      identifier,
      userInfo: userInfo.value,
      episodeData: episodeData?.value,
    });
    console.log(
      '[useMySubmissions][DEBUG] episodeData at execute:',
      episodeData?.value,
    );
    if (!identifier) {
      data.value = [];
      error.value = null;
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(GOOGLE_SHEET_API_URL);
      if (!response.ok) throw new Error('Failed to fetch Google Sheet data');
      const sheetData = await response.json();
      console.log('[useMySubmissions][DEBUG] 1 | got response from sheetdata:');
      // Map Google Sheet columns to app fields by index (array-of-arrays)
      // Column mapping:
      // 0: Timestamp, 1: Email, 2: Show/Movie, 3: First Name, 4: Phone, 5: Show Name, 6: Season/Episode,
      // 7: Scene Start Time, 8: Scene End Time, 9: Types of Content, 10: Plot Explanation, etc.
      function parseTime(str: any): number {
        if (!str) return 0;
        const parts = String(str).split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3)
          return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return Number(str) || 0;
      }
      console.log('[useMySubmissions][DEBUG] 2 | finished parseTime function:');
      let errorCount = 0;
      let mappedSubmissions: MySubmission[] = [];
      const userPhone: string = String(userInfo?.value?.phone).replace(
        /\D/g,
        '',
      );
      if (Array.isArray(sheetData) && Array.isArray(sheetData[0])) {
        // Only use userInfo for filtering, no fallback or stacking

        const rows = sheetData.slice(1);
        mappedSubmissions = rows
          .filter((row: any[], idx: number) => {
            // DEBUG: Phone filter
            const rowPhone = String(row[4] || '').replace(/\D/g, '');
            console.log('[DEBUG][Phone Filter]', {
              userPhone,
              rowPhone,
              rowRawPhone: row[4],
            });
            if (userPhone) {
              if (rowPhone !== userPhone) return false;
            } else {
              return false;
            }

            // DEBUG: Episode filter
            if (episodeData?.value?.showName && row[5]) {
              const rowShow = String(row[5]).trim().toLowerCase();
              const targetShow = String(episodeData.value.showName)
                .trim()
                .toLowerCase();
              console.log('[DEBUG][Episode Filter]', {
                episodeData: episodeData?.value,
                rowShow,
                targetShow,
                rowSeasonEpisode: row[6],
                filterSeason: episodeData?.value?.season,
                filterNumber: episodeData?.value?.number,
              });
              if (rowShow !== targetShow) {
                return false;
              }
            }

            // Season/episode filtering using helper
            if (
              episodeData?.value?.season &&
              episodeData?.value?.number &&
              row[6]
            ) {
              const extractSeasonEpisode = (
                seasonEpisodeStr: string,
              ): { season: string | null; episode: string | null } => {
                seasonEpisodeStr = seasonEpisodeStr.toLowerCase();
                const regex =
                  /season\s*(\d+)\s*(special\s*)?episode\s*(\d+)|s(\d+)\s*e(\d+)|s(\d+)e(\d+)/i;
                const match = seasonEpisodeStr.match(regex);
                let seasonMatch = null;
                let episodeMatch = null;
                if (match) {
                  seasonMatch = match[1] || match[4] || match[6];
                  episodeMatch = match[3] || match[5] || match[7];
                }
                if (!seasonMatch || !episodeMatch) {
                  const numbers = seasonEpisodeStr.match(/\d+/g);
                  if (numbers && numbers.length >= 2) {
                    seasonMatch = numbers[0];
                    episodeMatch = numbers[1];
                  }
                }
                if (!seasonMatch || !episodeMatch) {
                  console.warn(
                    '[useMySubmissions][WARN] Could not extract season/episode:',
                    seasonEpisodeStr,
                  );
                }
                return {
                  season: seasonMatch ? String(seasonMatch) : null,
                  episode: episodeMatch ? String(episodeMatch) : null,
                };
              };
              const { season, episode } = extractSeasonEpisode(
                row[6].toString(),
              );
              console.log(
                '[useMySubmissions][DEBUG] Extracted season/episode:',
                { season, episode, row6: row[6] },
              );
              if (
                String(season) !== String(episodeData.value?.season) ||
                String(episode) !== String(episodeData.value?.number)
              ) {
                if (season && episode) {
                  console.log(
                    '[useMySubmissions][DEBUG] Season/episode mismatch:',
                    {
                      parsed: { season, episode },
                      expected: {
                        season: episodeData.value?.season,
                        episode: episodeData.value?.number,
                      },
                      //: row[6],
                    },
                  );
                }
                return false;
              }
            }

            return true; // Only if all filters pass
          })
          .map((row: any[], idx: number) => {
            const startRaw = row[7] || '';
            const endRaw = row[8] || '';
            const startSeconds = parseTime(startRaw);
            const endSeconds = parseTime(endRaw);
            if (errorCount < 5) {
              if (!row[0]) {
                console.warn(
                  '[useMySubmissions][WARN] No timestamp ID for row',
                  idx,
                  row,
                );
                errorCount++;
              }
              if (!startRaw || startSeconds === 0) {
                console.warn(
                  '[useMySubmissions][WARN] Blank or malformed start time: Row:',
                  idx,
                );
                errorCount++;
              }
              if (!endRaw || endSeconds === 0) {
                console.warn(
                  '[useMySubmissions][WARN] Blank or malformed end time: Row:',
                  idx,
                );
                errorCount++;
              }
            }
            return {
              id: row[0] || idx,
              start_time: startRaw,
              start_seconds: startSeconds,
              end_time: endRaw,
              end_seconds: endSeconds,
              type: String(row[9] || ''),
              explanation: row[10] || '',
              state: '', // No explicit Status column in your mapping, add if needed
              submitted_at: row[0] || '',
              show_name: row[5] || '',
              season_episode: row[6] || '',
              edit_link: row[19] || '', // Column T (index 19)
            } as MySubmission;
          });
      } else if (Array.isArray(sheetData)) {
        // Only use userInfo for filtering, no fallback or stacking

        mappedSubmissions = (sheetData as any[])
          .filter((row, idx) => {
            const startRaw = row['Scene Start Time'] || '';
            const endRaw = row['Scene End Time'] || '';
            if (!startRaw || !endRaw) return false;
            // Only show timestamps for the current session user
            if (userPhone) {
              const rowPhone = String(row['Phone Number'] || '').replace(
                /\D/g,
                '',
              );
              if (rowPhone !== userPhone) return false;
            } else {
              // If no session user, show nothing
              return false;
            }
            // Show name filtering (case-insensitive, trimmed)
            if (episodeData?.value?.showName && row['Show Name (Full)']) {
              const rowShow = String(row['Show Name (Full)'])
                .trim()
                .toLowerCase();
              const targetShow = String(episodeData.value?.showName)
                .trim()
                .toLowerCase();
              if (rowShow !== targetShow) {
                return false;
              }
            }
            console.log(
              '[useMySubmissions][DEBUG] 3.5 | Row keys:',
              Object.keys(row),
            );
            // Season/episode filtering
            const seasonEpisodeKey = Object.keys(row).find(
              (k) =>
                k.trim().toLowerCase().includes('season') &&
                k.trim().toLowerCase().includes('episode'),
            );
            const seasonEpisodeValue = seasonEpisodeKey
              ? row[seasonEpisodeKey]
              : undefined;
            console.log('[DEBUG] Filtering for episode:', {
              season: episodeData?.value?.season,
              number: episodeData?.value?.number,
              seasonEpisodeKey,
              seasonEpisodeValue,
              row,
            });
            if (
              episodeData?.value?.season &&
              episodeData?.value?.number &&
              seasonEpisodeValue
            ) {
              console.log(
                '[useMySubmissions][DEBUG] 4 | entered season and episode if statement:',
                seasonEpisodeValue.toString(),
              );
              const extractSeasonEpisode = (
                seasonEpisodeStr: string,
              ): { season: string | null; episode: string | null } => {
                seasonEpisodeStr = seasonEpisodeStr.toLowerCase();
                const regex =
                  /season\s*(\d+)\s*(special\s*)?episode\s*(\d+)|s(\d+)\s*e(\d+)|s(\d+)e(\d+)/i;
                const match = seasonEpisodeStr.match(regex);
                let seasonMatch = null;
                let episodeMatch = null;
                if (match) {
                  seasonMatch = match[1] || match[4] || match[6];
                  episodeMatch = match[3] || match[5] || match[7];
                }
                if (!seasonMatch || !episodeMatch) {
                  const numbers = seasonEpisodeStr.match(/\d+/g);
                  if (numbers && numbers.length >= 2) {
                    seasonMatch = numbers[0];
                    episodeMatch = numbers[1];
                  }
                }
                if (!seasonMatch || !episodeMatch) {
                  console.warn(
                    '[useMySubmissions][WARN] Could not extract season/episode:',
                    seasonEpisodeStr,
                  );
                }
                return {
                  season: seasonMatch ? String(seasonMatch) : null,
                  episode: episodeMatch ? String(episodeMatch) : null,
                };
              };
            }
          })

          .map((row, idx) => {
            const startRaw = row['Scene Start Time'] || '';
            const endRaw = row['Scene End Time'] || '';
            const startSeconds = parseTime(startRaw);
            const endSeconds = parseTime(endRaw);
            if (errorCount < 5) {
              if (!row['Timestamp ID']) {
                console.warn(
                  '[useMySubmissions] Missing Timestamp ID for row',
                  idx,
                );
                errorCount++;
              }
              if (!startRaw || startSeconds === 0) {
                console.warn(
                  '[useMySubmissions] Blank or malformed start time: Row:',
                  idx,
                );
                errorCount++;
              }
              if (!endRaw || endSeconds === 0) {
                console.warn(
                  '[useMySubmissions] Blank or malformed end time: Row:',
                  idx,
                );
                errorCount++;
              }
            }
            return {
              id: row['Timestamp ID'] || idx,
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
              edit_link: row['Edit Link'] || '', // Use the correct key for the edit link
            } as MySubmission;
          });
      }
      data.value = mappedSubmissions;
      // Debug: log filtered data
      console.log('[useMySubmissions] Filtered submissions:', data.value);
    } catch (err: any) {
      console.error('Error fetching from Google Sheet:', err);
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
