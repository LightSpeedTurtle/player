<script lang="ts" setup>
import { useSessionUserInfo } from '../composables/useSessionUserInfo';
import { ref, computed, watch, onMounted, watchEffect } from 'vue';
import {
  useEpisodeLinks,
  type EpisodeLinkSet,
} from '../composables/useEpisodeLinks';
import { formatTimestampInS } from '../utils/time-utils';

// No longer exporting SubmissionData as it's internal to the pre-fill logic now

const props = defineProps<{
  startTime: string | number;
  endTime: string | number;
  episodeIdentifier?: string; // Usually the URL of the current episode, or a unique ID
  currentPageUrl?: string; // Added to get the full URL for prefill
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
  'https://docs.google.com/forms/d/e/1FAIpQLSemj8Yea0hZloQTjrsbLibFANfNIDFe0B3zeGRZU3tB_FS84w/viewform';
// IMPORTANT: Replace these placeholder entry IDs with the actual values from your new Google Form.
// You can find these by inspecting the form's HTML or using the 'Get pre-filled link' feature.
const entryIds = {
  showOrMovie: 'entry.2030484978', // e.g., entry.123456789
  firstName: 'entry.549317747', // e.g., entry.234567890
  phone: 'entry.1862971484', // e.g., entry.345678901
  titleName: 'entry.157604786', // e.g., entry.456789012
  seasonAndEpisode: 'entry.847768405', // e.g., entry.567890123 (Used if 'Show' is selected)
  sceneStartTime: 'entry.272854963', // e.g., entry.678901234
  sceneEndTime: 'entry.575276722', // e.g., entry.789012345
  contentType: 'entry.12341966', // e.g., entry.890123456 (For checkboxes, append multiple times)
  plotDescription: 'entry.1704199248', // e.g., entry.901234567
  crunchyrollLink: 'entry.196890503', // e.g., entry.012345678
  hianimeLink: 'entry.1796451259', // e.g., entry.112233445
  animepaheLink: 'entry.1345515441', // e.g., entry.223344556
  nineAnimeLink: 'entry.1000804819', // e.g., entry.334455667
  netflixLink: 'entry.1648223720', // e.g., entry.445566778
  // episodeIdentifierHidden: 'ENTRY_ID_FOR_EPISODE_IDENTIFIER_HIDDEN' // Optional: if you add a hidden field for the raw identifier/URL
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

// --- Episode Specific Links State ---
const { getLinksForEpisode, saveLinksForEpisode } = useEpisodeLinks();
const crunchyrollLink = ref('');
const hianimeLink = ref('');
const animepaheLink = ref('');
const nineAnimeLink = ref('');
const netflixLink = ref('');

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

// Load saved links when the modal is mounted or episodeIdentifier changes
watchEffect(async () => {
  if (props.episodeIdentifier) {
    const savedLinks = await getLinksForEpisode(props.episodeIdentifier);

    // Initialize all link refs to empty strings
    crunchyrollLink.value = '';
    hianimeLink.value = '';
    animepaheLink.value = '';
    nineAnimeLink.value = '';
    netflixLink.value = '';

    let prefilledFromCurrentUrlForCrunchy = false;

    // Attempt to prefill from currentPageUrl if available
    if (props.currentPageUrl) {
      try {
        const currentUrl = new URL(props.currentPageUrl);
        const hostname = currentUrl.hostname.toLowerCase();

        if (hostname.includes('crunchyroll.com')) {
          crunchyrollLink.value = props.currentPageUrl;
          prefilledFromCurrentUrlForCrunchy = true;
        } else if (
          hostname.includes('hianime.to') ||
          hostname.includes('aniwave.to')
        ) {
          hianimeLink.value = props.currentPageUrl;
        } else if (
          hostname.includes('animepahe.com') ||
          hostname.includes('animepahe.ru')
        ) {
          animepaheLink.value = props.currentPageUrl;
        } else if (hostname.includes('9anime')) {
          // Broad match for 9anime domains
          nineAnimeLink.value = props.currentPageUrl;
        } else if (hostname.includes('netflix.com')) {
          netflixLink.value = props.currentPageUrl;
        }
      } catch (e) {
        console.warn(
          'Could not parse currentPageUrl for domain matching:',
          props.currentPageUrl,
          e,
        );
      }
    }

    // Apply saved links, which will override prefill from current URL if present for that specific link
    if (savedLinks) {
      if (savedLinks.crunchyrollLink)
        crunchyrollLink.value = savedLinks.crunchyrollLink;
      if (savedLinks.hianimeLink) hianimeLink.value = savedLinks.hianimeLink;
      if (savedLinks.animepaheLink)
        animepaheLink.value = savedLinks.animepaheLink;
      if (savedLinks.nineAnimeLink)
        nineAnimeLink.value = savedLinks.nineAnimeLink;
      if (savedLinks.netflixLink) netflixLink.value = savedLinks.netflixLink;
    }

    // Fallback for Crunchyroll link using episodeIdentifier or currentPageUrl if still empty
    // This maintains the original behavior where episodeIdentifier might be a Crunchyroll URL.
    if (!crunchyrollLink.value) {
      // If CR link is still empty after domain check and saved links
      if (
        props.episodeIdentifier &&
        props.episodeIdentifier.includes('crunchyroll.com')
      ) {
        crunchyrollLink.value = props.episodeIdentifier;
      } else if (
        props.currentPageUrl &&
        props.currentPageUrl.includes('crunchyroll.com') &&
        !prefilledFromCurrentUrlForCrunchy
      ) {
        // If episodeIdentifier wasn't a CR link, but currentPageUrl is, and it wasn't caught by the hostname check
        crunchyrollLink.value = props.currentPageUrl;
      }
    }
  } else {
    // If no episodeIdentifier, clear all links (should also be handled by initialization above, but good for clarity)
    crunchyrollLink.value = '';
    hianimeLink.value = '';
    animepaheLink.value = '';
    nineAnimeLink.value = '';
    netflixLink.value = '';
  }
});

// --- Functions ---
async function submitToGoogleForm() {
  // Made async to await link saving
  // Only use userInfo (from composable) for prefill

  const { userInfo } = useSessionUserInfo();

  submissionError.value = null; // Clear previous errors
  try {
    // Save the current links for this episode before constructing the form URL
    if (props.episodeIdentifier) {
      const currentLinks: EpisodeLinkSet = {
        crunchyrollLink: crunchyrollLink.value.trim(),
        hianimeLink: hianimeLink.value.trim(),
        animepaheLink: animepaheLink.value.trim(),
        nineAnimeLink: nineAnimeLink.value.trim(),
        netflixLink: netflixLink.value.trim(),
      };
      await saveLinksForEpisode(props.episodeIdentifier, currentLinks);
    }

    const params = new URLSearchParams();

    // Pre-fill fields based on the new form structure and entry IDs
    params.set(entryIds.showOrMovie, isShow.value ? 'Show' : 'Movie');
    params.set(entryIds.firstName, props.firstName || '');
    params.set(entryIds.phone, props.phone || '');
    params.set(entryIds.titleName, props.showName || ''); // Maps to 'Show/Movie Name (Full)'

    if (isShow.value) {
      params.set(entryIds.seasonAndEpisode, formattedSeasonEpisode.value);
    }

    params.set(entryIds.sceneStartTime, formattedStartTime.value);
    params.set(entryIds.sceneEndTime, formattedEndTime.value);

    selectedTypes.value.forEach((type) => {
      params.append(entryIds.contentType, type);
    });

    params.set(entryIds.plotDescription, explanation.value.trim() || '');

    // Pre-fill Link Fields
    params.set(entryIds.crunchyrollLink, crunchyrollLink.value.trim());
    params.set(entryIds.hianimeLink, hianimeLink.value.trim());
    params.set(entryIds.animepaheLink, animepaheLink.value.trim());
    params.set(entryIds.nineAnimeLink, nineAnimeLink.value.trim());
    params.set(entryIds.netflixLink, netflixLink.value.trim());

    // Optional: If you add a hidden field in your Google Form for the raw episodeIdentifier (URL/ID from the player)
    // if (entryIds.episodeIdentifierHidden && props.episodeIdentifier) {
    //   params.set(entryIds.episodeIdentifierHidden, props.episodeIdentifier);
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

      <!-- First Name Display -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">First Name</span>
        </label>
        <input
          type="text"
          :value="props.firstName"
          class="input input-bordered w-full"
          disabled
        />
      </div>

      <!-- Phone Number Display -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Phone Number</span>
        </label>
        <input
          type="text"
          :value="props.phone"
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

      <!-- Plot Description -->
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

      <!-- Crunchyroll Link Input -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Crunchyroll Link (Optional)</span>
        </label>
        <input
          type="url"
          v-model="crunchyrollLink"
          placeholder="Crunchyroll URL for this episode"
          class="input input-bordered w-full"
        />
      </div>

      <!-- Hianime Link Input -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Hianime Link (Optional)</span>
        </label>
        <input
          type="url"
          v-model="hianimeLink"
          placeholder="Paste Hianime URL for this episode"
          class="input input-bordered w-full"
        />
      </div>

      <!-- Animepahe Link Input -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Animepahe Link (Optional)</span>
        </label>
        <input
          type="url"
          v-model="animepaheLink"
          placeholder="Paste Animepahe URL for this episode"
          class="input input-bordered w-full"
        />
      </div>

      <!-- 9Anime Link Input -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">9Anime Link (Optional)</span>
        </label>
        <input
          type="url"
          v-model="nineAnimeLink"
          placeholder="Paste 9Anime URL for this episode"
          class="input input-bordered w-full"
        />
      </div>

      <!-- Netflix Link Input -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Netflix Link (Optional)</span>
        </label>
        <input
          type="url"
          v-model="netflixLink"
          placeholder="Paste Netflix URL for this episode"
          class="input input-bordered w-full"
        />
      </div>

      <!-- Error Display -->
      <div v-if="submissionError" class="alert alert-error shadow-lg mt-4">
        <div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current flex-shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{{ submissionError }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-action mt-4">
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
