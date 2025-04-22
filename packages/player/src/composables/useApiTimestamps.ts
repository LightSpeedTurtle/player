import { computed } from 'vue';
import { useEpisodeIdentifier } from './useEpisodeIdentifier';
import { useSupabaseTimestamps } from './useSupabaseTimestamps';
import { AmbiguousTimestamp } from '../utils/timestamp-utils'; // Import necessary types
import type { ActiveTimestamp } from './useSupabaseTimestamps'; // Import type from the composable where it's now defined
import { TimestampSource, User } from '../utils/api'; // Import Enum and User type directly from generated types

// TODO: Define mapping from Supabase type strings to internal type IDs if needed
// These IDs likely come from the original project's database schema or constants.
// Replace placeholders with actual UUIDs used elsewhere in the player.
const typeStringToIdMap: Record<string, string> = {
  suggestive: 'SUGGESTIVE_TYPE_ID_PLACEHOLDER',
  nudity: 'NUDITY_TYPE_ID_PLACEHOLDER',
  sexual_acts: 'SEXUAL_ACTS_TYPE_ID_PLACEHOLDER',
  // Add mappings for other types if they exist in Supabase
};
const UNKNOWN_TYPE_ID = 'UNKNOWN_TYPE_ID_PLACEHOLDER'; // Define a fallback ID

// Define SUPABASE source if it doesn't exist in TimestampSource enum
// (Assuming TimestampSource might need extension or we use a custom value)
// Check the definition of TimestampSource in timestamp-utils.ts
// Use a VALID enum member from the current generated types.
// TODO: Update GraphQL schema/types or define local enum if 'AnimeSkip' is semantically incorrect for Supabase source.
const SOURCE_SUPABASE = TimestampSource.AnimeSkip;

/**
 * Fetches timestamps from Supabase based on the current episode identifier
 * and maps them to the AmbiguousTimestamp format for the UI.
 */
export default function useApiTimestamps() {
  const { identifier } = useEpisodeIdentifier();
  // Get reactive state from the Supabase fetching composable
  const {
    data: supabaseData,
    isLoading,
    error,
  } = useSupabaseTimestamps(identifier);

  // TODO: Handle isLoading and error states appropriately if needed downstream
  // For example, you could expose them from this composable:
  // return { timestamps: computedTimestamps, isLoading, error };

  const computedTimestamps = computed((): AmbiguousTimestamp[] => {
    if (!supabaseData.value) {
      // Return empty array if data is null (initial state, error, or no data)
      return [];
    }

    // Map ActiveTimestamp (Supabase) to AmbiguousTimestamp (Player UI)
    const mappedTimestamps = supabaseData.value.map(
      (ts: ActiveTimestamp, index: number): AmbiguousTimestamp => {
        // Map Supabase type string to internal typeId
        const typeId = typeStringToIdMap[ts.type] || UNKNOWN_TYPE_ID;

        // Construct the AmbiguousTimestamp object
        // Ensure this structure matches the fields expected by components like TimelineSection
        // and functions like buildSections.
        // Construct the AmbiguousTimestamp object, ensuring it matches TimestampFragment structure
        // Construct the AmbiguousTimestamp object, ensuring it matches TimestampFragment structure
        // Add placeholder/default values for fields required by TimestampFragment but not present in ActiveTimestamp
        return {
          __typename: 'Timestamp',
          id: ts.id, // From Supabase view
          at: ts.start_time, // From Supabase view
          typeId: typeId, // Mapped from Supabase view 'type'
          source: SOURCE_SUPABASE, // Set source explicitly

          // Add required fields from TimestampFragment with default/placeholder values
          createdAt: new Date().toISOString(), // Placeholder - use current time
          updatedAt: new Date().toISOString(), // Placeholder - use current time
          episodeId: identifier.value ?? 'UNKNOWN_EPISODE_ID', // Use current identifier or fallback
          // createdBy and updatedBy are complex objects (User type). Use minimal placeholders.
          // Check if downstream code actually *uses* these specific fields from the fragment.
          // If not, simpler placeholders might suffice. If used, more complex mocking might be needed.
          createdBy: {
            // Add missing fields to satisfy User type
            __typename: 'User',
            id: 'SUPABASE_USER_PLACEHOLDER',
            username: 'supabase',
            profileUrl: '', // Add placeholder
            createdAt: new Date(0).toISOString(), // Add placeholder (Epoch)
          }, // Removed type assertion
          updatedBy: {
            // Add missing fields to satisfy User type
            __typename: 'User',
            id: 'SUPABASE_USER_PLACEHOLDER',
            username: 'supabase',
            profileUrl: '', // Add placeholder
            createdAt: new Date(0).toISOString(), // Add placeholder (Epoch)
          }, // Removed type assertion

          // Optional fields from ActiveTimestamp, include if needed by AmbiguousTimestamp/TimestampFragment
          // endAt: ts.end_time,
          // explanation: ts.explanation,
        };
      },
    );

    // Note: applyTimestampsOffset is removed as offset logic was tied to the old API query.
    // If offset is still needed, it must be fetched/applied differently (e.g., from user settings or episode data).
    return mappedTimestamps;
  });

  // Return the computed, mapped timestamps
  return computedTimestamps;
}
