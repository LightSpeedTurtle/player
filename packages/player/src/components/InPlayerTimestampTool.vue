<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import IconMarkStart from '~icons/mdi/flag-plus-outline';
import IconMarkEnd from '~icons/mdi/flag-checkered';
import IconConfirm from '~icons/mdi/check';
import IconCancel from '~icons/mdi/close';
import { formatTimestampInS } from '../utils/time-utils';

const props = defineProps<{
  isTimestamper: boolean; // Placeholder prop for role check
}>();

const emits = defineEmits<{
  (event: 'requestSubmit', startTime: number, endTime: number): void;
}>();

const { currentTime } = useVideoControls();

type MarkingState = 'idle' | 'markingEnd' | 'confirming';
const markingState = ref<MarkingState>('idle');
const startTime = ref<number | null>(null);
const endTime = ref<number | null>(null);

// Button computed properties
const buttonIcon = computed(() => {
  if (markingState.value === 'idle') return IconMarkStart;
  if (markingState.value === 'markingEnd') return IconMarkEnd;
  return IconConfirm; // Should not happen if confirm/cancel buttons are shown
});

const buttonText = computed(() => {
  if (markingState.value === 'idle') return 'Mark Start';
  if (markingState.value === 'markingEnd') {
    return `Mark End (${formatTimestampInS(startTime.value ?? 0, false)})`;
  }
  // Confirming state shows separate buttons
  return 'Confirm'; // Fallback, should not be visible
});

const buttonClass = computed(() => {
  if (markingState.value === 'idle') return 'btn-primary';
  if (markingState.value === 'markingEnd') return 'btn-accent';
  return 'btn-success'; // Fallback
});

// Actions
function handleMainButtonClick() {
  if (markingState.value === 'idle') {
    startTime.value = currentTime.value;
    endTime.value = null; // Clear previous end time
    markingState.value = 'markingEnd';
  } else if (markingState.value === 'markingEnd') {
    // Ensure end time is after start time
    if (currentTime.value > (startTime.value ?? -1)) {
      endTime.value = currentTime.value;
      markingState.value = 'confirming';
    } else {
      // Optional: Show an error or just reset
      console.warn('End time must be after start time.');
      resetState();
    }
  }
}

function confirmSubmission() {
  if (startTime.value !== null && endTime.value !== null) {
    emits('requestSubmit', startTime.value, endTime.value);
    // Don't reset state here; wait for modal confirmation/cancellation in parent
    // resetState(); // Removed reset from here
  }
}

function cancelMarking() {
  resetState();
}

function resetState() {
  markingState.value = 'idle';
  startTime.value = null;
  endTime.value = null;
}

// Removed defineExpose - parent no longer needs to call resetState

// Watch for prop changes if needed, though role shouldn't change mid-session often
// watch(() => props.isTimestamper, (isTimestamper) => {
//   if (!isTimestamper) {
//     resetState(); // Reset if user loses role?
//   }
// });
</script>

<template>
  <div v-if="isTimestamper" class="flex items-center gap-2">
    <!-- Main Mark Start/End Button -->
    <button
      v-if="markingState !== 'confirming'"
      type="button"
      class="btn btn-sm gap-1"
      :class="buttonClass"
      @click="handleMainButtonClick"
      :title="
        markingState === 'idle'
          ? 'Mark segment start time'
          : 'Mark segment end time'
      "
    >
      <component :is="buttonIcon" class="w-4 h-4" />
      {{ buttonText }}
    </button>

    <!-- Confirm/Cancel Buttons -->
    <template v-if="markingState === 'confirming'">
      <span class="text-xs text-base-content text-opacity-80">
        Marked: {{ formatTimestampInS(startTime ?? 0, false) }} -
        {{ formatTimestampInS(endTime ?? 0, false) }}
      </span>
      <button
        type="button"
        class="btn btn-sm btn-success btn-outline gap-1"
        @click="confirmSubmission"
        title="Confirm segment and add details"
      >
        <icon-confirm class="w-4 h-4" /> Confirm
      </button>
      <button
        type="button"
        class="btn btn-sm btn-error btn-outline gap-1"
        @click="cancelMarking"
        title="Cancel marking segment"
      >
        <icon-cancel class="w-4 h-4" /> Cancel
      </button>
    </template>
  </div>
</template>
