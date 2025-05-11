<script lang="ts" setup>
import Toolbar from './Toolbar.vue';
import UserInfoModal from './UserInfoModal.vue';
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
import SessionUserInfoModal from './SessionUserInfoModal.vue'; // Import session modal
// Removed SubmissionData import as it's no longer exported or needed here
import { useEpisodeIdentifier } from '../composables/useEpisodeIdentifier'; // Import identifier composable directly
import { useMySubmissions } from '../composables/useMySubmissions'; // Import submissions composable directly
import { Ref } from 'vue';
// Import Supabase client and types directly
import { createClient, User } from '@supabase/supabase-js';
import InPlayerTimestampTool from './InPlayerTimestampTool.vue'; // Import tool to get ref
import useEpisodeInfoQuery from '../composables/useEpisodeInfoQuery'; // Import the query composable

const root = ref<HTMLDivElement>();
// Removed inPlayerToolRef - will use internal reset in tool component

const isMouseActive = usePlayerMouseActive(root);

const { playing, buffering } = useVideoControls();

// --- In-Player Submission Modal Logic ---
const showSubmissionModal = ref(false);
const showSessionUserInfoModal = ref(false);
const showUserInfoModal = ref(false); // For phone modal

// Pause video when either modal is shown
watch(
  [showSubmissionModal, showSessionUserInfoModal],
  ([submissionOpen, userInfoOpen]) => {
    if (submissionOpen || userInfoOpen) {
      playing.value = false;
    }
  },
);

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

// --- Auth Helper (Commented out as Supabase is disabled for now) ---
// const getCurrentUser = async (): Promise<User | null> => {
//   const {
//     data: { session },
//     error,
//     } = await supabase.auth.getSession();
//   if (error) {
//     console.error('Error getting Supabase session:', error.message);
//     return null;
//   }
//   return session?.user ?? null;
// };
// --- End Auth Helper ---

// --- Submission Function (Commented out as Supabase is disabled for now) ---
// const createSubmission = async (
//   submissionData: Omit<SubmissionData, 'submitter_user_id'>,
// ): Promise<any | null> => {
//   const user = await getCurrentUser(); // This would also cause an error if uncommented
//   if (!user) {
//     console.error('createSubmission: No user logged in.');
//     throw new Error('You must be logged in to submit timestamps.');
//   }
//   const recordToInsert = { ...submissionData, submitter_user_id: user.id };
//   try {
//     const { data, error } = await supabase
//       .from('submissions')
//       .insert(recordToInsert)
//       .select()
//       .single();
//     if (error) {
//       console.error('Error creating submission:', error.message);
//       throw error;
//     }
//     console.log('Submission created successfully:', data);
//     return data;
//   } catch (err: any) {
//     console.error('Unexpected error in createSubmission:', err);
//     throw err;
//   }
// };
// --- End Submission Function ---

// --- In-Player Submission Modal Logic ---

import { useSessionUserInfo } from '../composables/useSessionUserInfo';
const { userInfo, saveUserInfo } = useSessionUserInfo();

if (!userInfo.value) {
  showSessionUserInfoModal.value = true;
}

// Watch for changes to userInfo for debugging
watch(
  () => userInfo.value,
  (val, oldVal) => {
    console.debug('[DEBUG] userInfo changed (composable):', { oldVal, val });
  },
  { immediate: true },
);

const pendingSubmissionTimes = ref<{
  startTime: number;
  endTime: number;
} | null>(null);
const { identifier: episodeIdentifier } = useEpisodeIdentifier();
// Fetch actual episode info using the query composable
const {
  data: episodeData, // Rename to avoid conflict with SubmissionData 'data' variable later
  isLoading: isEpisodeInfoLoading, // Optional: use for loading states if needed
  isError: isEpisodeInfoError, // Optional: use for error states if needed
} = useEpisodeInfoQuery();

watch(
  episodeData,
  (val) => {
    console.log('[DEBUG] episodeData.value in Player.vue:', val);
  },
  { immediate: true },
);

import { computed } from 'vue';
// ...
const normalizedEpisodeData = computed(() => {
  const ed = episodeData.value || {};
  return {
    showName: ed.showName ?? '',
    season: ed.season ?? '',
    number: ed.number ?? '',
  };
});

const { refetch: refetchMySubmissions } = useMySubmissions({
  episodeData: normalizedEpisodeData,
}); // Get refetch function for user submissions

// Called by event handler in Toolbar.vue (or directly if tool is moved here)
function openSubmissionModal(startTime: number, endTime: number) {
  if (!userInfo.value) {
    showSessionUserInfoModal.value = true;
    pendingSubmissionTimes.value = { startTime, endTime };
    return;
  }
  console.log(`Opening submission modal for ${startTime} - ${endTime}`);
  pendingSubmissionTimes.value = { startTime, endTime };
  showSubmissionModal.value = true;
}

function handleSessionUserInfoSubmit(info: {
  firstName: string;
  phone: string;
}) {
  saveUserInfo(info);
  showSessionUserInfoModal.value = false;
  // If a submission was pending, open the modal now
  if (pendingSubmissionTimes.value) {
    showSubmissionModal.value = true;
  }
}

// Removed handleModalSubmit function as the modal now handles opening the form directly

function handleModalCancel() {
  // Renamed from handleModalCancel to handleModalClose for clarity
  console.log('Submission modal closed.');
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
  <session-user-info-modal
    v-if="showSessionUserInfoModal"
    @submit="handleSessionUserInfoSubmit"
  />
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
        :session-user-info="userInfo"
        @request-submit="openSubmissionModal"
        @show-user-modal="showUserInfoModal = true"
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
    v-if="
      showSubmissionModal &&
      pendingSubmissionTimes &&
      episodeIdentifier &&
      userInfo
    "
    :start-time="pendingSubmissionTimes.startTime"
    :end-time="pendingSubmissionTimes.endTime"
    :episode-identifier="episodeIdentifier"
    :show-name="episodeData?.showName"
    :season-number="episodeData?.season?.toString()"
    :episode-number="episodeData?.number?.toString()"
    :first-name="userInfo?.firstName"
    :phone="userInfo?.phone"
    @close="handleModalCancel"
  />
  <UserInfoModal
    :visible="showUserInfoModal"
    @close="showUserInfoModal = false"
  />
</template>
