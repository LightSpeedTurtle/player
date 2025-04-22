2# Refactoring Notes - Supabase Timestamp Integration

This document outlines planned refactoring steps to fully integrate timestamp handling with Supabase and remove legacy GraphQL dependencies.

**Current Status (as of 2025-04-12):**

- Supabase client setup complete.
- Storage (`IPlayerStorage`) migrated to Supabase (`user_settings` table).
- Authentication components (`LoginForm`, `SignupForm`, `AccountMenu`, `ToolbarAccount`) migrated to Supabase Auth.
- In-player submission tool (`InPlayerTimestampTool`, `SubmissionModal`) created and saves new submissions to Supabase `submissions` table.
- Timestamp _fetching_ for the main timeline (`useApiTimestamps`) refactored to query Supabase `active_timestamps` view, but still maps data back to legacy `AmbiguousTimestamp` type for compatibility.
- Side panel list (`TimestampList`) refactored to fetch user's submissions (`MySubmission[]`) from Supabase `submissions` table via `useMySubmissions`.
  **Known Issues:**
- **Build/Export Problem:** The Vite/Rollup build process for the `@anime-skip/player` package intermittently fails to recognize named exports from `./utils/supabase.ts` when re-exported via `index.ts`. Explicitly separating type/value exports or using `export *` doesn't consistently fix it. Moving code directly into `index.ts` was considered but rejected for modularity reasons. Needs further investigation if it causes deployment issues.

**Problem:** Mismatch between Supabase data types (`MySubmission`, `ActiveTimestamp`) and the legacy `AmbiguousTimestamp` type used by UI components (`TimestampListItem`, `TimelineSection`) and editing logic (`EditTimestampForm`, `useSaveChangesMutation`, etc.). Mapping Supabase data back to `AmbiguousTimestamp` is complex and error-prone.
**Problem:** Mismatch between Supabase data types (`MySubmission`, `ActiveTimestamp`) and the legacy `AmbiguousTimestamp` type used by UI components (`TimestampListItem`, `TimelineSection`) and editing logic (`EditTimestampForm`, `useSaveChangesMutation`, etc.). Mapping Supabase data back to `AmbiguousTimestamp` is complex and error-prone.

**Proposed Full Refactoring Plan (Deferred):**

1.  **Define Core Types:** Solidify Supabase-based types (`ActiveTimestamp`, `MySubmission`, `EditableSubmission`).
2.  **Refactor Data Fetching:** Keep `useSupabaseTimestamps`, `useMySubmissions`. Retire GraphQL query composables.
3.  **Refactor State Management:** Retire `useCurrentTimestamps`, `useEditedTimestamps`, etc. Create `useEditingSubmissionsState` using `EditableSubmission`. Adapt `useIsEditing`, `useActiveTimestamp`.
4.  **Refactor Utilities (`timestamp-utils.ts`):** Remove GraphQL type dependencies. Update functions (`buildSections`, `isTimestampSkipped`) for Supabase types. Define local `TimestampSource` enum. Update type ID mappings in `isTimestampSkipped`.
5.  **Refactor Submission/Saving Logic:** Keep `createSubmission`. Create `updateSubmission`, `deleteSubmission` in `supabase.ts`. Retire `useSaveChangesMutation`. Create `useSubmitEdits` composable using Supabase functions. Replace `useCreateTimestamp`, `useDeleteTimestamp`, etc.
6.  **Refactor UI Components:** Update `Timeline`, `TimelineSection`, `TimestampList`, `TimestampListItem`, `EditTimestampForm`, `SidePanelTimestamps` to use Supabase-based types (`ActiveTimestamp`, `MySubmission`, `EditableSubmission`) directly.
7.  **Cleanup:** Remove `graphql.generated.ts`, related dependencies, and unused code.

**Current Action (Resuming Previous Plan):**

- Focus on displaying `MySubmission` data in `TimestampList.vue` / `TimestampListItem.vue`.
- Modify `TimestampListItem.vue` to accept `MySubmission` prop directly.
- Temporarily disable/remove editing/deleting functionality within `TimestampListItem.vue` due to type incompatibility with existing editing composables.
