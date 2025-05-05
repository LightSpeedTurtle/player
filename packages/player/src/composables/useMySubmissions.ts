import { ref, watch, shallowRef } from 'vue';

import type { MySubmission } from '../types/MySubmission';

// Reactive state management for the user's submissions
import { useEpisodeIdentifier } from './useEpisodeIdentifier';

// Accept sessionUserInfo as an argument for filtering
import type { Ref, ShallowRef } from 'vue';

export function useMySubmissions({
  sessionUserInfo,
  episodeData,
}: {
  sessionUserInfo?: { phone: string };
  episodeData?: { showName: string; season: string; number: string };
} = {}): {
  isLoading: Ref<boolean>;
  error: ShallowRef<Error | null>;
  data: ShallowRef<MySubmission[] | null>;
  refetch: () => void;
} {
  const isLoading = ref(false);
  const error = shallowRef<Error | null>(null);
  const data = shallowRef<MySubmission[] | null>(null);

  const { identifier: episodeIdentifier } = useEpisodeIdentifier();

  const GOOGLE_SHEET_API_URL =
    'https://script.google.com/macros/s/AKfycbwdbg4IqRtlH2uq5FEaQJIdJqkkZIcNk9tGXrWWqugLXGU6n7SnWrL9ozK1NMxhuaFI/exec';

  const execute = async (identifier: string | null) => {
    console.log(
      '[useMySubmissions][DEBUG] episodeData at execute:',
      episodeData,
    );
    console.log(
      '[useMySubmissions][DEBUG] episodeIdentifier at execute:',
      identifier,
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

      let errorCount = 0;
      let mappedSubmissions: MySubmission[] = [];
      console.log(
        '[useMySubmissions] sheetData type:',
        Array.isArray(sheetData)
          ? Array.isArray(sheetData[0])
            ? 'array-of-arrays'
            : 'array-of-objects'
          : typeof sheetData,
        sheetData,
      );
      if (Array.isArray(sheetData) && Array.isArray(sheetData[0])) {
        console.log('[useMySubmissions][DEBUG] Using array-of-arrays logic');
        // Assume first row is header
        const userPhone = sessionUserInfo?.phone
          ? String(sessionUserInfo.phone).replace(/\D/g, '')
          : null;
        console.log(
          '[useMySubmissions][DEBUG] sheetData before filtering:',
          sheetData,
        );
        const rows = sheetData.slice(1);
        console.log('[useMySubmissions][DEBUG] Filtering rows:', rows);
        mappedSubmissions = rows
          .filter((row: any[], idx: number) => {
            console.log('[useMySubmissions][DEBUG] Filtering row', idx, row);
            // Only keep rows with both start and end times
            if (!row[7] || !row[8]) return false;

            // Debug: show row show/season/ep
            console.log(
              '[useMySubmissions][DEBUG] Row show:',
              row[5],
              'Row season/ep:',
              row[6],
              'for episodeData:',
              episodeData,
            );

            // User phone filtering (working)
            if (userPhone) {
              const rowPhone = String(row[4] || '').replace(/\D/g, '');
              if (rowPhone !== userPhone) return false;
            }

            // Robust show name filtering (case-insensitive, trimmed)
            if (episodeData?.showName && row[5]) {
              const rowShow = String(row[5]).trim().toLowerCase();
              const targetShow = String(episodeData.showName)
                .trim()
                .toLowerCase();
              if (rowShow !== targetShow) {
                console.log(
                  '[useMySubmissions][DEBUG] Show name mismatch:',
                  rowShow,
                  targetShow,
                );
                return false;
              }
            }

            // Robust season/episode filtering
            if (episodeData?.season && episodeData?.number && row[6]) {
              const seasonEpisodeStr = row[6].toString().toLowerCase();
              // Regex: match S2 E31, S2E31, Season 2 Episode 31, Season 2 Special Episode 31, etc.
              const regex =
                /season\s*(\d+)\s*(special\s*)?episode\s*(\d+)|s(\d+)\s*e(\d+)|s(\d+)e(\d+)/i;
              const match = seasonEpisodeStr.match(regex);
              let seasonMatch = null;
              let episodeMatch = null;
              if (match) {
                seasonMatch = match[1] || match[4] || match[6];
                episodeMatch = match[3] || match[5] || match[7];
              }
              // Fallback: try to extract numbers in order (for weird formats)
              if (!seasonMatch || !episodeMatch) {
                const numbers = seasonEpisodeStr.match(/\d+/g);
                if (numbers && numbers.length >= 2) {
                  seasonMatch = numbers[0];
                  episodeMatch = numbers[1];
                }
              }
              console.log(
                '[useMySubmissions][DEBUG] Extracted season:',
                seasonMatch,
                'episode:',
                episodeMatch,
                'from:',
                seasonEpisodeStr,
              );
              if (
                String(seasonMatch) !== String(episodeData.season) ||
                String(episodeMatch) !== String(episodeData.number)
              ) {
                console.log(
                  '[useMySubmissions][DEBUG] Season/episode mismatch:',
                  seasonEpisodeStr,
                  'parsed:',
                  seasonMatch,
                  episodeMatch,
                  'expected:',
                  episodeData.season,
                  episodeData.number,
                );
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
        console.log('[useMySubmissions][DEBUG] Using array-of-objects logic');
        // Fallback: treat as array of objects (old logic)
        // Always read from localStorage at runtime
        console.log(
          '[useMySubmissions][object] localStorage.getItem:',
          localStorage.getItem('sessionUserInfo'),
        );
        const sessionUserInfo = JSON.parse(
          localStorage.getItem('sessionUserInfo') || '{}',
        );
        const userPhone = sessionUserInfo?.phone
          ? String(sessionUserInfo.phone).replace(/\D/g, '')
          : null;
        //console.log('[useMySubmissions][object] User phone:', userPhone);
        mappedSubmissions = (sheetData as any[])
          .filter((row) => {
            const startRaw = row['Scene Start Time'] || '';
            const endRaw = row['Scene End Time'] || '';
            if (!startRaw || !endRaw) return false;
            // Debug: log row keys and phone value
            //console.log(
            //  '[useMySubmissions][object] Row keys:',
            //  Object.keys(row),
            //);
            // console.log(
            //   '[useMySubmissions][object] Row phone raw:',
            //   row['Phone Number'],
            //   '| All row values:',
            //   row,
            // );
            if (userPhone) {
              const rowPhone = String(row['Phone Number'] || '').replace(
                /\D/g,
                '',
              );
              // console.log(
              //   '[useMySubmissions][object] Row phone:',
              //   row['Phone Number'],
              //   'Normalized:',
              //   rowPhone,
              //   'User:',
              //   userPhone,
              // );
              return rowPhone === userPhone;
            }
            return true;
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
        showName: episodeData.showName,
        season: episodeData.season,
        number: episodeData.number,
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
