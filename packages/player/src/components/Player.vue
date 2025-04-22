<script lang="ts" setup>
import Toolbar from './Toolbar.vue';
import EpisodeInfo from './EpisodeInfo.vue';
import SidePanel from './SidePanel.vue';
import ReturnToPlayerButton from './ReturnToPlayerButton.vue';
import { PlayerVisibility } from '../utils/PlayerVisibility';
import ManualSkipButton from './ManualSkipButton.vue';
import { QueryKey } from '../utils/QueryKey';
import ContextMenu from './ContextMenu.vue';
import ScreenshotPreview from './ScreenshotPreview.vue';
import { PlayerEvent } from '../utils/PlayerEvent';
import SubmissionModal from './SubmissionModal.vue'; // Import modal
import type { SubmissionData } from './SubmissionModal.vue'; // Import type
import { useEpisodeIdentifier } from '../composables/useEpisodeIdentifier'; // Import identifier composable directly
import { useMySubmissions } from '../composables/useMySubmissions'; // Import submissions composable directly
// Import Supabase client and types directly
import { createClient, User } from '@supabase/supabase-js';
import InPlayerTimestampTool from './InPlayerTimestampTool.vue'; // Import tool to get ref

const root = ref<HTMLDivElement>();
// Removed inPlayerToolRef - will use internal reset in tool component

const isMouseActive = usePlayerMouseActive(root);

const { playing, buffering } = useVideoControls();

const { view } = useView();
const toolbarModalOpen = computed(
  () => view.value === 'preferences' || view.value === 'account',
);
const { disableContextMenu } = usePlayerOptions();

const visibility = usePlayerVisibility();

const { isEditing } = useIsEditing();
const { pref: minimizeToolbarWhenEditing } = useReadonlyPreference(
  'minimizeToolbarWhenEditing',
);

const isToolbarHidden = computed(
  () =>
    !isMouseActive.value &&
    playing.value &&
    !toolbarModalOpen.value &&
    (!isEditing.value || !!minimizeToolbarWhenEditing.value),
);

useTheme();
useSyncPlaybackRate();
useAutoSkip();
useKeyboardActions();
useAutoconnectEpisode();

// Preload queries that need ran ASAP
useAllTimestampTypesQuery();
useAccountQuery();

// URL change behavior
const client = useQueryClient();
const { data: url } = useCurrentUrlQuery();
const discardChanges = useDiscardChanges();

watch(url, () => {
  client.invalidateQueries(QueryKey.EpisodeInfo);
  if (isEditing.value) {
    // TODO: Don't discard changes, ask if the user wants to save their changes for the previous episode
    discardChanges();
  }
});

const preview = useScreenshotPreview();

useCustomEventListener<PlayerEvent>(PlayerEvent.TYPE, ({ detail }) => {
  switch (detail.type) {
    case 'setPlayerVisibility':
      visibility.value = detail.visibility;
      break;
    case 'showScreenshot':
      preview.value = detail.url;
      break;
  }
});
// --- Supabase Client Setup (Copied from utils/supabase.ts) ---
// TODO: Ensure this is only initialized once using a singleton pattern or provide/inject
// --- Temporarily Commented Out for Debugging Background Script Error ---
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
// if (!supabaseUrl) throw new Error('Supabase URL is not configured.');
// if (!supabaseAnonKey) throw new Error('Supabase Anon Key is not configured.');
// const supabase = createClient(supabaseUrl, supabaseAnonKey);
// --- End Temporary Comment Out ---
// TODO: This component will likely break until this is restored and Supabase access is properly handled (e.g., via provide/inject or a dedicated composable)
const supabase = null; // Provide a dummy value for now to avoid other errors
// --- End Supabase Client Setup ---

// --- Auth Helper (Copied from utils/supabase.ts, needed for createSubmission) ---
const getCurrentUser = async (): Promise<User | null> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting Supabase session:', error.message);
    return null;
  }
  return session?.user ?? null;
};
// --- End Auth Helper ---

// --- Submission Function (Moved from utils/supabase.ts) ---
const createSubmission = async (
  submissionData: Omit<SubmissionData, 'submitter_user_id'>,
): Promise<any | null> => {
  const user = await getCurrentUser();
  if (!user) {
    console.error('createSubmission: No user logged in.');
    throw new Error('You must be logged in to submit timestamps.');
  }
  const recordToInsert = { ...submissionData, submitter_user_id: user.id };
  try {
    const { data, error } = await supabase
      .from('submissions')
      .insert(recordToInsert)
      .select()
      .single();
    if (error) {
      console.error('Error creating submission:', error.message);
      throw error;
    }
    console.log('Submission created successfully:', data);
    return data;
  } catch (err: any) {
    console.error('Unexpected error in createSubmission:', err);
    throw err;
  }
};
// --- End Submission Function ---

// --- In-Player Submission Modal Logic ---
const showSubmissionModal = ref(false);
const submissionError = ref<string | null>(null); // For errors during submission itself
const isSubmitting = ref(false); // Loading state for submission
const pendingSubmissionTimes = ref<{
  startTime: number;
  endTime: number;
} | null>(null);
const { identifier: episodeIdentifier } = useEpisodeIdentifier();
const { refetch: refetchMySubmissions } = useMySubmissions(); // Get refetch function for user submissions

// TODO: Fetch episode info (showName, season, episode) if needed for SubmissionData
// This might involve using useEpisodeInfoQuery or similar
const episodeInfo = ref({
  showName: 'Placeholder Show',
  seasonNumber: '1',
  episodeNumber: '1',
}); // Placeholder

// Called by event handler in Toolbar.vue (or directly if tool is moved here)
function openSubmissionModal(startTime: number, endTime: number) {
  console.log(`Opening submission modal for ${startTime} - ${endTime}`);
  pendingSubmissionTimes.value = { startTime, endTime };
  submissionError.value = null; // Clear previous errors
  isSubmitting.value = false;
  showSubmissionModal.value = true;
}

async function handleModalSubmit(data: SubmissionData) {
  console.log('Submitting data:', data);
  isSubmitting.value = true;
  submissionError.value = null;
  try {
    const result = await createSubmission(data);
    if (result) {
      console.log('Submission successful:', result);
      closeAndResetModal();
      refetchMySubmissions(); // Refetch user's submissions to update the side panel list
      // TODO: Optionally show a success message/toast
    } else {
      // Should have thrown error, but handle defensively
      submissionError.value = 'Submission failed for an unknown reason.';
    }
  } catch (err: any) {
    console.error('Submission failed:', err);
    submissionError.value =
      err.message || 'An unexpected error occurred during submission.';
  } finally {
    isSubmitting.value = false;
  }
}

function handleModalCancel() {
  console.log('Submission modal cancelled.');
  closeAndResetModal();
}

function closeAndResetModal() {
  showSubmissionModal.value = false;
  pendingSubmissionTimes.value = null;
  // Tool will reset itself internally now
}

// --- End Submission Modal Logic ---
</script>

<template>
  <!-- Player -->
  <div
    v-show="visibility === PlayerVisibility.Visible"
    class="w-full h-full pointer-events-auto flex"
  >
    <div
      ref="root"
      class="relative transition-colors flex-1"
      :class="{
        'bg-base-100 bg-opacity-50': !playing || buffering,
        'cursor-none': isToolbarHidden,
      }"
      @click="playing = !playing"
    >
      <div
        v-if="playing && buffering"
        class="flex absolute inset-0 pointer-events-none"
      >
        <div class="spinner w-16 h-16 m-auto" />
      </div>

      <episode-info class="absolute top-0 inset-x-0" :hidden="playing" />

      <!-- Pass handler up -->
      <toolbar
        class="absolute bottom-0 inset-x-0"
        :hidden="isToolbarHidden"
        @request-submit="openSubmissionModal"
      />

      <manual-skip-button class="absolute bottom-20 right-4" />

      <screenshot-preview />
    </div>

    <side-panel class="h-full z-10" />

    <context-menu v-if="!disableContextMenu" />
  </div>

  <!-- Other top level UIs -->
  <return-to-player-button
    v-if="visibility === PlayerVisibility.ServiceSettings"
    class="pointer-events-auto absolute top-16 right-16 z-[9999]"
  />

  <!-- Submission Modal (conditionally rendered) -->
  <submission-modal
    v-if="showSubmissionModal && pendingSubmissionTimes && episodeIdentifier"
    :start-time="pendingSubmissionTimes.startTime"
    :end-time="pendingSubmissionTimes.endTime"
    :episode-identifier="episodeIdentifier"
    :show-name="episodeInfo.showName"
    :season-number="episodeInfo.seasonNumber"
    :episode-number="episodeInfo.episodeNumber"
    :is-loading="isSubmitting"
    :error="submissionError"
    @submit="handleModalSubmit"
    @cancel="handleModalCancel"
  />
</template>
