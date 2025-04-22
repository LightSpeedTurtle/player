<script lang="ts" setup>
import { ref, computed } from 'vue';
import { formatTimestampInS } from '../utils/time-utils';
// Removed import for ActiveTimestamp as SubmissionData is defined here

// Define the structure for the data to be submitted
// Align this with the columns in your Supabase 'submissions' table
// (excluding auto-generated ones like id, submitted_at, submitter_user_id)
export interface SubmissionData {
  episode_identifier: string; // Need to get this from parent/global state
  show_name?: string;
  season_number?: string; // Or number
  episode_number?: string; // Or number
  start_time: number;
  end_time: number;
  type: string; // 'suggestive', 'nudity', 'sexual_acts'
  explanation?: string;
  // Add other relevant fields if needed for submission
}

const props = defineProps<{
  startTime: number;
  endTime: number;
  episodeIdentifier: string; // Passed from parent
  // Optional: Pass show/season/episode info if available
  showName?: string;
  seasonNumber?: string;
  episodeNumber?: string;
  // Added props for loading/error state from parent
  isLoading: boolean;
  error: string | null;
}>();

const emits = defineEmits<{
  (event: 'submit', data: SubmissionData): void;
  (event: 'cancel'): void;
}>();

// TODO: Get these types dynamically if possible, or keep hardcoded
const contentTypes = ['suggestive', 'nudity', 'sexual_acts'];

const selectedType = ref<string>(contentTypes[0]); // Default selection
const explanation = ref('');
// Removed local isLoading and error refs, use props instead

const formattedStartTime = computed(() =>
  formatTimestampInS(props.startTime, false),
);
const formattedEndTime = computed(() =>
  formatTimestampInS(props.endTime, false),
);

async function submit() {
  // isLoading state is now managed by the parent

  const submissionData: SubmissionData = {
    episode_identifier: props.episodeIdentifier,
    show_name: props.showName,
    season_number: props.seasonNumber,
    episode_number: props.episodeNumber,
    start_time: props.startTime,
    end_time: props.endTime,
    type: selectedType.value,
    explanation: explanation.value.trim() || undefined, // Send undefined if empty
  };

  // Emit the data for the parent component to handle the actual Supabase call
  emits('submit', submissionData);

  // Parent component should set isLoading=false and handle errors/closing the modal
}

function cancel() {
  emits('cancel');
}
</script>

<template>
  <!-- Basic Modal Structure (using daisyUI classes assumed from other components) -->
  <div class="modal modal-open">
    <div class="modal-box relative flex flex-col gap-4">
      <button
        type="button"
        class="btn btn-sm btn-circle absolute right-2 top-2"
        @click="cancel"
        title="Close"
        :disabled="isLoading"
      >
        <!-- Disable close button while loading -->✕
      </button>
      <h3 class="font-bold text-lg">Confirm Timestamp Submission</h3>

      <!-- Display Times -->
      <p class="text-sm">
        Segment: <span class="font-mono">{{ formattedStartTime }}</span> -
        <span class="font-mono">{{ formattedEndTime }}</span>
      </p>

      <!-- Content Type Selection -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Content Type</span>
        </label>
        <select
          class="select select-bordered"
          v-model="selectedType"
          :disabled="isLoading"
        >
          <option v-for="type in contentTypes" :key="type" :value="type">
            {{ type.replace('_', ' ') }}
            <!-- Basic formatting -->
          </option>
        </select>
      </div>

      <!-- Explanation Textarea -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Explanation (Optional)</span>
        </label>
        <textarea
          class="textarea textarea-bordered h-24"
          placeholder="Why is this segment being marked?"
          v-model="explanation"
          :disabled="isLoading"
          @keydown.stop
        >
<!-- Prevent player shortcuts --></textarea
        >
      </div>

      <!-- Error Display -->
      <p v-if="error" class="text-error text-sm text-center">{{ error }}</p>

      <!-- Actions -->
      <div class="modal-action mt-2">
        <button
          type="button"
          class="btn btn-ghost"
          @click="cancel"
          :disabled="isLoading"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :class="{ loading: isLoading }"
          @click="submit"
          :disabled="isLoading"
        >
          Submit
        </button>
      </div>
    </div>
  </div>
</template>
