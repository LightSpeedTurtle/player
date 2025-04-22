<script lang="ts" setup>
import { formatTimestampInS } from '../utils/time-utils';
import IconEdit from '~icons/anime-skip/edit';
import IconClose from '~icons/anime-skip/close';
// import InPlaceTimestampTypeSelect from './InPlaceTimestampTypeSelect.vue'; // Removed: Incompatible with MySubmission
import type { MySubmission } from '../utils/supabase'; // Import the submission type
// Removed imports for AmbiguousTimestamp, useTimestampEditedState, TimestampState

const props = defineProps<{
  // Changed prop type to MySubmission
  submission: MySubmission;
}>();

// Use submission fields directly
const startTime = computed(() =>
  formatTimestampInS(props.submission.start_time, false),
);
const endTime = computed(() =>
  formatTimestampInS(props.submission.end_time, false),
);
const typeDisplay = computed(() => props.submission.type.replace('_', ' ')); // Basic formatting

const { currentTime } = useVideoControls();
function goToTimestamp() {
  currentTime.value = props.submission.start_time; // Seek to start_time
}

// Removed composables related to editing/deleting AmbiguousTimestamp
// const deleteTimestamp = useDeleteTimestamp();
// const editTimestamp = useEditExistingTimestamp();

const hoveredId = useHoveredTimestampId();
const setHovered = useThrottleFn(() => {
  // hoveredId.value = props.submission.id; // Use submission ID if hover needed
});
function clearHovered() {
  // hoveredId.value = undefined;
}

// Removed useTimestampEditedState - use submission.state directly
</script>

<template>
  <tr
    @mouseenter="setHovered"
    @mousemove="setHovered"
    @mouseleave="clearHovered"
  >
    <td class="h-12">
      <div class="pl-2 pr-4 cursor-pointer" @click="goToTimestamp">
        <!-- Display Start and End Time -->
        <p class="text-sm font-mono text-right">
          {{ startTime }} - {{ endTime }}
        </p>
        <!-- Display Submission State -->
        <p
          class="uppercase text-[0.66rem] font-bold -mt-1 text-right"
          :class="{
            'text-warning': submission.state === 'pending',
            'text-success': submission.state === 'approved',
            'text-error': submission.state === 'rejected', // Assuming 'rejected' state exists
            'text-base-content text-opacity-60':
              submission.state !== 'pending' &&
              submission.state !== 'approved' &&
              submission.state !== 'rejected',
          }"
        >
          {{ submission.state }}
        </p>
      </div>
    </td>

    <!-- Display Type and Explanation -->
    <td class="w-full h-12 align-top pt-1 pb-1" :title="submission.explanation">
      <!-- Show explanation on hover -->
      <div class="flex flex-col">
        <p class="font-semibold capitalize">{{ typeDisplay }}</p>
        <p
          v-if="submission.explanation"
          class="text-xs text-base-content text-opacity-70 mt-0.5 truncate"
        >
          <!-- Truncate long explanation -->
          {{ submission.explanation }}
        </p>
      </div>
      <!-- Editing/Deleting controls removed for now as they expect AmbiguousTimestamp -->
    </td>
  </tr>
</template>
