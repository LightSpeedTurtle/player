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
  currentTime: number;
}>();

// Use raw string for display
const startTime = computed(() => props.submission.start_time || '');
const endTime = computed(() => props.submission.end_time || '');

// Compute if this timestamp is active (highlighted)
const isActive = computed(() => {
  return (
    typeof props.currentTime === 'number' &&
    props.currentTime >= (props.submission.start_seconds || 0) &&
    props.currentTime <= (props.submission.end_seconds || 0)
  );
});
const typeDisplay = computed(() =>
  String(props.submission.type ?? '').replace('_', ' '),
); // Guaranteed safe formatting

// Helper to format season/episode as 'Sx Ex' from string or fallback
function formatSeasonEpisode(seasonEpisode: string): string {
  if (!seasonEpisode) return '';
  // Try to extract numbers
  const match = seasonEpisode.match(/(\d+)[^\d]+(\d+)/);
  if (match) {
    return `S${match[1]} E${match[2]}`;
  }
  return seasonEpisode;
}

const { currentTime } = useVideoControls();
function goToTimestamp() {
  // Use start_seconds for seeking, but display start_time (string)
  currentTime.value = props.submission.start_seconds || 0;
}

function editSubmission() {
  if (props.submission.edit_link) {
    window.open(props.submission.edit_link, '_blank');
  }
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
  <button
    type="button"
    :class="[
      'w-full flex items-center justify-between rounded-lg px-4 py-3 mb-2 shadow-sm transition group cursor-pointer',
      isActive
        ? 'btn-primary border-primary text-primary-content font-bold'
        : 'bg-neutral-800 hover:bg-neutral-700',
    ]"
    @click="goToTimestamp"
    @mouseenter="setHovered"
    @mousemove="setHovered"
    @mouseleave="clearHovered"
  >
    <div class="flex flex-col items-start gap-0.5 text-left">
      <span class="font-mono text-xs text-base-content/70 tracking-wide">
        {{ formatSeasonEpisode(submission.season_episode) }}
      </span>
      <span class="font-mono text-base font-bold leading-5">
        {{ startTime }} – {{ endTime }}
      </span>
      <span class="text-xs text-base-content/70 mt-0.5">
        {{ typeDisplay }}
      </span>
    </div>
    <button
      v-if="submission.edit_link"
      class="ml-4 opacity-60 group-hover:opacity-100 transition p-1 rounded hover:bg-neutral-600"
      title="Edit this timestamp"
      @click.stop="editSubmission"
      tabindex="-1"
    >
      <IconEdit class="w-4 h-4" />
    </button>
  </button>
</template>
