<script lang="ts" setup>
import { formatTimestampInS } from '../utils/time-utils';
import IconEdit from '~icons/anime-skip/edit';
import IconClose from '~icons/anime-skip/close';
// import InPlaceTimestampTypeSelect from './InPlaceTimestampTypeSelect.vue'; // Removed: Incompatible with MySubmission
// Temporarily define MySubmission type inline to remove supabase dependency
import type { MySubmission } from '../types/MySubmission';
// Removed imports for AmbiguousTimestamp, useTimestampEditedState, TimestampState

const props = defineProps<{
  submission: MySubmission;
}>();

// Use raw string for display
const startTime = computed(() => props.submission.start_time || '');
const endTime = computed(() => props.submission.end_time || '');
const typeDisplay = computed(() =>
  String(props.submission.type ?? '').replace('_', ' '),
); // Guaranteed safe formatting

const { currentTime } = useVideoControls();
function goToTimestamp() {
  // Use start_seconds for seeking, but display start_time (string)
  currentTime.value = props.submission.start_seconds || 0;
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
    <td>
      <span class="font-mono">{{ submission.season_episode }}</span>
    </td>
    <td>
      <span class="font-mono">{{ startTime }} - {{ endTime }}</span>
    </td>
    <td>
      <span
        class="uppercase text-xs font-bold"
        :class="{
          'text-warning': submission.state === 'pending',
          'text-success': submission.state === 'approved',
          'text-error': submission.state === 'rejected',
          'text-base-content text-opacity-60':
            submission.state !== 'pending' &&
            submission.state !== 'approved' &&
            submission.state !== 'rejected',
        }"
      >
        {{
          submission.state.charAt(0).toUpperCase() + submission.state.slice(1)
        }}
      </span>
    </td>

    <!-- Display Type and Explanation -->
    <td
      class="h-12 w-full"
      :title="`${startTime} – ${endTime} | ${typeDisplay}
${
  submission.explanation ? 'Note: ' + submission.explanation + '\n' : ''
}Status: ${submission.state}`"
    >
      <div
        class="pl-2 pr-4 cursor-pointer flex flex-col items-start gap-0.5"
        @click="goToTimestamp"
      >
        <!-- Start/End Time -->
        <div class="flex items-center gap-2">
          <span class="text-sm font-mono">{{ startTime }} – {{ endTime }}</span>
          <span class="ml-auto text-xs capitalize">{{ typeDisplay }}</span>
        </div>
        <!-- Status -->
        <div class="flex items-center gap-2 mt-1">
          <span
            class="text-xs font-bold"
            :class="{
              'text-success': submission.state === 'approved',
              'text-warning': submission.state === 'pending',
              'text-error': submission.state === 'rejected',
              'text-base-content text-opacity-60':
                submission.state !== 'pending' &&
                submission.state !== 'approved' &&
                submission.state !== 'rejected',
            }"
          >
            {{
              submission.state.charAt(0).toUpperCase() +
              submission.state.slice(1)
            }}
          </span>
          <span
            v-if="submission.explanation"
            class="text-xs text-base-content text-opacity-70 truncate ml-2"
          >
            <i>({{ submission.explanation }})</i>
          </span>
        </div>
      </div>
    </td>
  </tr>
</template>
