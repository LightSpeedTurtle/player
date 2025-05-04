import { ref } from 'vue';

export interface UserSubmittedTimestamp {
  start: number;
  end: number;
  contentType: string;
  episode: string;
  season?: string;
  phone: string;
}

const userSubmittedTimestamps = ref<UserSubmittedTimestamp[]>([]);

/**
 * Fetch user-submitted timestamps from a Google Sheets endpoint.
 * This function should be implemented to call your Apps Script or Sheets API endpoint.
 * @param phone User's phone number
 * @param episode Episode name/identifier
 * @param season Season (if any)
 */
function parseTimeMMSS(str: string): number {
  // Accepts MM:SS or M:SS
  const [min, sec] = str.split(':').map(Number);
  return min * 60 + sec;
}

export async function fetchUserSubmittedTimestamps(
  phone: string,
  episode: string,
  season?: string,
) {
  // TODO: Replace with your endpoint URL
  const endpoint = `https://script.google.com/macros/s/AKfycbwdbg4IqRtlH2uq5FEaQJIdJqkkZIcNk9tGXrWWqugLXGU6n7SnWrL9ozK1NMxhuaFI/exec?phone=${encodeURIComponent(
    phone,
  )}&episode=${encodeURIComponent(episode)}${
    season ? `&season=${encodeURIComponent(season)}` : ''
  }`;
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('Failed to fetch user timestamps');
  const rows = await response.json();
  // Map columns: C=showOrMovie, D=firstName, E=phone, F=showName, G=seasonAndEpisode, H=start, I=end, J=contentType, K=plotDescription
  userSubmittedTimestamps.value = rows.map((row: any) => ({
    showOrMovie: row['Show or Movie?'],
    firstName: row['First Name'],
    phone: row['Phone Number'],
    showName: row['Show Name'],
    seasonAndEpisode: row['Season and Episode'],
    start: parseTimeMMSS(row['Scene Start Time']),
    end: parseTimeMMSS(row['Scene End Time']),
    contentType: row['Type of Content'],
    plotDescription:
      row[
        'Did anything important to the plot happen in this scene? If so, please describe it (spare us any explicit details or language though). If not, leave this blank'
      ],
  }));
}

export function useUserSubmittedTimestamps() {
  return userSubmittedTimestamps;
}
