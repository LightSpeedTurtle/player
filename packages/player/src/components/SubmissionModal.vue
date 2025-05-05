<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { formatTimestampInS } from '../utils/time-utils';

// No longer exporting SubmissionData as it's internal to the pre-fill logic now

const props = defineProps<{
  startTime: string | number;
  endTime: string | number;
  episodeIdentifier: string;
  showName?: string;
  seasonNumber?: string;
  episodeNumber?: string;
  firstName: string;
  phone: string;
}>();

// Changed emit event from 'submit' to 'close'
const emits = defineEmits<{
  (event: 'close'): void;
}>();

// --- Google Form Configuration ---
const googleFormBaseUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLSf2WWjjsq4W3H9u0cuFXL1KzWVJ-aOaOSczp9l0T8JnJOkhFw/viewform';
const entryIds = {
  showOrMovie: 'entry.2030484978',
  titleName: 'entry.157604786',
  sceneStartTime: 'entry.272854963',
  sceneEndTime: 'entry.575276722',
  contentType: 'entry.12341966', // All three content types use this entry ID
  plotDescription: 'entry.1704199248',
  seasonAndEpisode: 'entry.847768405',
  firstName: 'entry.549317747',
  phone: 'entry.1862971484',
  // Add hidden field ID if you want to pass episodeIdentifier
  // hiddenEpisodeIdentifier: 'ENTRY_ID_FOR_EPISODE_IDENTIFIER'
};
// --- End Configuration ---

// TODO: Get these types dynamically if possible, or keep hardcoded to match form
const availableContentTypes = [
  'Suggestive Dialogue/References',
  'Nudity (Full/Partial/Revealing Clothing)',
  'Sexual Acts (Sexualization or Intimate physical activity)',
]; // Should match checkbox values in Google Form

// --- Form State ---
const isShow = ref(!!(props.seasonNumber || props.episodeNumber)); // Initial guess based on props
const selectedTypes = ref<string[]>([]);
const explanation = ref('');
const submissionError = ref<string | null>(null); // For errors opening the form

// --- Computed Values ---
const formattedStartTime = computed(() =>
  typeof props.startTime === 'string'
    ? props.startTime
    : formatTimestampInS(props.startTime, false),
);
const formattedEndTime = computed(() =>
  typeof props.endTime === 'string'
    ? props.endTime
    : formatTimestampInS(props.endTime, false),
);
const formattedSeasonEpisode = computed(() => {
  if (!isShow.value) return '';
  return props.seasonNumber && props.episodeNumber
    ? `S${props.seasonNumber} E${props.episodeNumber}`
    : props.seasonNumber || props.episodeNumber || ''; // Handle cases where only one is present
});

// Update isShow if props change (though unlikely in a modal context)
watch(
  () => [props.seasonNumber, props.episodeNumber],
  ([season, episode]) => {
    isShow.value = !!(season || episode);
  },
);

// --- Functions ---
function submitToGoogleForm() {
  // Only use sessionUserInfo (props.firstName, props.phone) for prefill

  submissionError.value = null; // Clear previous errors
  try {
    const params = new URLSearchParams();

    // Section 1: Show/Movie Choice
    params.set(entryIds.showOrMovie, isShow.value ? 'Show' : 'Movie');

    // Section 2/3 Common Fields
    params.set(entryIds.titleName, props.showName || '');
    params.set(entryIds.sceneStartTime, formattedStartTime.value);
    params.set(entryIds.sceneEndTime, formattedEndTime.value);
    params.set(entryIds.plotDescription, explanation.value.trim() || '');
    params.set(entryIds.firstName, props.firstName || '');
    params.set(entryIds.phone, props.phone || '');

    // Content Type Checkboxes
    selectedTypes.value.forEach((type) => {
      // Use the specific entry ID for checkboxes. The _sentinel is usually a hidden field.
      // Double-check your form's pre-filled link generator for the correct way to handle checkboxes.
      // Often, each checkbox option has its own value associated with the *same* entry ID.
      params.append(entryIds.contentType, type);
    });

    // Section 2 Only (Show)
    if (isShow.value) {
      params.set(entryIds.seasonAndEpisode, formattedSeasonEpisode.value);
    }

    // Optional: Add hidden fields like episodeIdentifier
    // if (entryIds.hiddenEpisodeIdentifier && props.episodeIdentifier) {
    //   params.set(entryIds.hiddenEpisodeIdentifier, props.episodeIdentifier);
    // }

    const prefilledUrl = `${googleFormBaseUrl}?${params.toString()}`;

    console.log('Opening Google Form:', prefilledUrl);
    window.open(prefilledUrl, '_blank'); // Open in new tab

    // Close the modal immediately after opening the form tab
    emits('close');
  } catch (err: any) {
    console.error('Error constructing or opening Google Form URL:', err);
    submissionError.value =
      'Could not open the submission form. Please try again.';
    // Keep the modal open so the user sees the error
  }
}

function cancel() {
  emits('close'); // Emit 'close' for cancel as well
}
</script>

<template>
  <div class="modal modal-open">
    <div class="modal-box relative flex flex-col gap-4">
      <!-- Close Button -->
      <button
        type="button"
        class="btn btn-sm btn-circle absolute right-2 top-2"
        @click="cancel"
        title="Close"
      >
        ✕
      </button>
      <h3 class="font-bold text-lg">Submit Timestamp to Google Form</h3>

      <!-- Show/Movie Selection -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Content Type</span>
        </label>
        <div class="flex gap-4">
          <label class="label cursor-pointer justify-start gap-2">
            <input
              type="radio"
              name="content-type-radio"
              class="radio radio-primary"
              :value="true"
              v-model="isShow"
            />
            <span class="label-text">Show</span>
          </label>
          <label class="label cursor-pointer justify-start gap-2">
            <input
              type="radio"
              name="content-type-radio"
              class="radio radio-primary"
              :value="false"
              v-model="isShow"
            />
            <span class="label-text">Movie</span>
          </label>
        </div>
      </div>

      <!-- Title Display -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">{{
            isShow ? 'Show Name' : 'Movie Title'
          }}</span>
        </label>
        <input
          type="text"
          :value="showName"
          class="input input-bordered w-full"
          disabled
        />
      </div>

      <!-- Season/Episode Display (Conditional) -->
      <div v-if="isShow" class="form-control w-full">
        <label class="label">
          <span class="label-text">Season & Episode</span>
        </label>
        <input
          type="text"
          :value="formattedSeasonEpisode"
          class="input input-bordered w-full"
          disabled
        />
      </div>

      <!-- Time Display -->
      <p class="text-sm">
        Segment: <span class="font-mono">{{ formattedStartTime }}</span> -
        <span class="font-mono">{{ formattedEndTime }}</span>
      </p>

      <!-- Content Type Checkboxes -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text"
            >Type of Content (Select all that apply)</span
          >
        </label>
        <div class="flex flex-col gap-2">
          <label
            v-for="type in availableContentTypes"
            :key="type"
            class="label cursor-pointer justify-start gap-2"
          >
            <input
              type="checkbox"
              :value="type"
              v-model="selectedTypes"
              class="checkbox checkbox-primary"
            />
            <!-- Capitalize and replace underscores for display -->
            <span class="label-text capitalize">{{
              type.replace(/_/g, ' ')
            }}</span>
          </label>
        </div>
        <p v-if="!selectedTypes.length" class="text-xs text-warning pt-1">
          Please select at least one content type.
        </p>
      </div>

      <!-- Explanation Textarea -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Plot Description (Optional)</span>
          <span class="label-text-alt"
            >Did anything important happen plot-wise?</span
          >
        </label>
        <textarea
          class="textarea textarea-bordered h-24"
          placeholder="Briefly describe any plot points during this segment."
          v-model="explanation"
          @keydown.stop
        ></textarea>
      </div>

      <!-- Error Display -->
      <p v-if="submissionError" class="text-error text-sm text-center">
        {{ submissionError }}
      </p>

      <!-- Actions -->
      <div class="modal-action mt-2">
        <button type="button" class="btn btn-ghost" @click="cancel">
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="submitToGoogleForm"
          :disabled="!selectedTypes.length"
        >
          Open Google Form
        </button>
      </div>
    </div>
  </div>
</template>
