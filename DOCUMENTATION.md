# User Info Modal & Session Management

## Purpose

This extension requires the user to provide a phone number for personalized filtering of timestamp submissions. If the phone number is missing from localStorage, the extension automatically prompts the user to enter it via a modal dialog.

## How It Works (2025+)

- User info (first name, phone) is managed via the `useSessionUserInfo` composable, which is the single source of truth for user info state.
- On mount, the app checks if `userInfo.value` exists (from the composable). If missing, the modal (`UserInfoModal.vue`) is shown to prompt for info.
- User info is validated and saved via the composable, which keeps both Vue state and `localStorage` in sync.
- All components should access user info via the composable, not directly from `localStorage`.
- The modal pre-fills fields with existing info (if any) and only resets to blank if no info is present.
- This ensures all user info is consistent, persistent, and reactively updates the UI wherever used.

## Developer Integration

- Import and use the composable in any component:

  ```js
  import { useSessionUserInfo } from '../composables/useSessionUserInfo';
  const { userInfo, saveUserInfo } = useSessionUserInfo();
  ```

- Show the modal by toggling the appropriate `showUserInfoModal` ref in your component.
- The modal emits a `close` event when the user saves their info.
- Always use the composable for reading and writing user info.

## Example

```js
import { useSessionUserInfo } from '../composables/useSessionUserInfo';
const { userInfo } = useSessionUserInfo();
if (!userInfo.value) {
  // Show modal
}
```

## Best Practices

- Always document user context requirements in your README and code comments.
- Use clear validation and error messages for user input.
- For multi-user or multi-field scenarios, expand the modal to collect more fields as needed.

# Submission Modal and Link Management

## Purpose

The Submission Modal allows users to submit timestamped scene information to a Google Form. It has been enhanced to support multiple streaming site links and provide a more intuitive user experience.

## Key Features and Behavior

### 1. Expanded Link Inputs

The modal now includes input fields for links from the following streaming services:

- Crunchyroll (Optional)
- Hianime
- Animepahe
- 9Anime
- Netflix

The "Crunchyroll Link" field is explicitly marked as optional.

### 2. Reordered Questions

To improve flow, the "Type of Content" selection now appears _before_ the streaming site link input fields in the modal.

### 3. Intelligent Link Prefilling

The modal attempts to prefill the relevant link input field based on the following logic:

- **Current Page URL**: If the user is on a recognized streaming site (e.g., `crunchyroll.com`, `hianime.to`, `animepahe.com`, `9anime.*`, `netflix.com`), the corresponding link field in the modal will be prefilled with the current page's URL.
- **Saved Links**: Links are saved on a per-episode basis (see "Per-Episode Link Storage" below). If a link for the current episode and a specific site has been previously saved, it will be loaded and will take precedence over prefilling from the current page URL.
- **Crunchyroll Fallback**: For the Crunchyroll link, if it's not prefilled by the current page URL or a saved link, the system will check if the `episodeIdentifier` prop (or `currentPageUrl` as a final attempt) appears to be a Crunchyroll URL and use that.

This logic is handled within the `watchEffect` hook in `SubmissionModal.vue`.

### 4. Per-Episode Link Storage

- A new composable, `useEpisodeLinks.ts`, manages the storage and retrieval of streaming site links for each episode.
- When a user enters or modifies links in the submission modal and submits the form, these links (Crunchyroll, Hianime, Animepahe, 9Anime, Netflix) are saved.
- These links are associated with the current `episodeIdentifier`.
- This uses the browser's local storage, accessed via `TypedStorage`'s generic `getRawItem` and `setRawItem` methods. This allows for flexible storage of the link object without strictly defining its type in `PlayerOptions`.

## Integration Details

- **`Player.vue`**: Passes the `currentPageUrl` (obtained from the `useCurrentUrlQuery` composable) to the `SubmissionModal` component. This URL is crucial for the domain-based prefilling logic.
- **`SubmissionModal.vue`**:
  - Receives `currentPageUrl` and `episodeIdentifier` as props.
  - Implements the prefilling and link loading logic in its `watchEffect`.
  - Saves the entered links using `useEpisodeLinks.saveLinksForEpisode` upon successful form submission preparation (before redirecting to Google Forms).
- **`useEpisodeLinks.ts`**: Provides `getLinksForEpisode(episodeId)` and `saveLinksForEpisode(episodeId, links)` functions.

## Google Sheets Integration

## Current Implementation

The extension fetches timestamp submissions from a Google Sheet via a Google Apps Script web app. The data is filtered server-side based on user phone number and episode identifier.

### Data Flow

1. Fetches data from: `GOOGLE_SHEET_API_URL`
2. Server-side filtering based on parameters:
   - `testMode`: When 'true', returns all rows without filtering
   - `userPhone`: Filters by exact phone number match
   - `identifier`: Filters by exact Crunchyroll ID match
3. Returns JSON array of matching rows with column headers as keys

## API Endpoint

```
GET https://script.google.com/macros/s/AKfycbyWSyat6E7Fnx359yhUDsvIYnFHy2InFlNCY68SgCX-fO62mP-Ui5cD1NbuhD2RmhDD/exec
```

### Query Parameters

- `testMode` (boolean): When true, returns all rows without filtering
- `userPhone` (string): Optional, filters by exact phone number match
- `identifier` (string): Optional, filters by exact Crunchyroll ID match

### Response Format

Array of objects where each object represents a row, with column headers as keys:

```typescript
[
  {
    Timestamp: '6/1/2025 12:00:00',
    'Email Address': 'user@example.com',
    Name: 'John Doe',
    'Phone Number': '+1234567890',
    'Show Name': 'Example Show',
    'Crunchyroll ID': 'S1E1',
    'Scene Start Time': '1:23',
    'Scene End Time': '2:34',
    Type: 'skip',
    Explanation: 'Example scene',
    'Edit Link': 'https://example.com/edit/1',
  },
  // ... more rows
];
```

### Google Form Enhancements

The Google Form linked from the Submission Modal has been updated to include fields for the new streaming site links:

- Crunchyroll Link (now optional in the form as well)
- Hianime Link
- Animepahe Link
- 9Anime Link
- Netflix Link

The prefill URL constructed by `SubmissionModal.vue` now includes these fields, populated by user input or the prefilling logic.

## Proposed Client-Side Implementation

### 1. Type Definitions

```typescript
interface SubmissionRow {
  Timestamp: string;
  'Email Address': string;
  Name: string;
  'Phone Number': string;
  'Show Name': string;
  'Crunchyroll ID': string;
  'Scene Start Time': string;
  'Scene End Time': string;
  Type: string;
  Explanation: string;
  'Edit Link'?: string;
}

interface FetchOptions {
  identifier?: string | null;
  userPhone?: string | null;
  testMode?: boolean;
}
```

### 2. Fetch Function

```typescript
async function fetchSubmissions({
  identifier = null,
  userPhone = null,
  testMode = false,
}: FetchOptions): Promise<SubmissionRow[]> {
  const url = new URL(GOOGLE_SHEET_API_URL);

  if (testMode) {
    url.searchParams.append('testMode', 'true');
  } else {
    if (userPhone) url.searchParams.append('userPhone', userPhone);
    if (identifier) url.searchParams.append('identifier', identifier);
  }

  const response = await fetchWithRetry(url.toString());
  return response.json();
}
```

### 3. Data Transformation

```typescript
function transformSubmission(row: SubmissionRow): MySubmission {
  return {
    id: row.Timestamp, // Using timestamp as ID
    start_time: row['Scene Start Time'],
    start_seconds: parseTime(row['Scene Start Time']),
    end_time: row['Scene End Time'],
    end_seconds: parseTime(row['Scene End Time']),
    type: row.Type,
    explanation: row.Explanation,
    state: '', // Not provided by API
    submitted_at: row.Timestamp,
    show_name: row['Show Name'],
    season_episode: row['Crunchyroll ID'],
    edit_link: row['Edit Link'] || '',
  };
}
```

## Implementation Plan

1. **Update Data Fetching**

   - Replace client-side filtering with server-side parameters
   - Update type definitions to match new API response
   - Implement proper error handling for API responses

2. **Update UI Components**

   - Ensure components work with new data structure
   - Update loading/error states
   - Add retry mechanism for failed requests

3. **Testing**
   - Test with various filter combinations
   - Verify error handling
   - Test with large result sets

## Future Improvements

1. **Pagination**

   - Add support for paginated responses
   - Implement infinite scroll or load more functionality

2. **Caching**

   - Add client-side caching for better performance
   - Implement cache invalidation strategy

3. **Error Handling**

   - Add more detailed error messages
   - Implement retry with exponential backoff

4. **Monitoring**
   - Add analytics for API usage
   - Monitor error rates and performance

## See Also

- `src/components/UserInfoModal.vue`
- `src/components/SidePanel.vue`
