<script lang="ts" setup>
import TimestampListItem from './TimestampListItem.vue';
import IconPlus from '~icons/anime-skip/plus';

// Define a mock type for mySubmissions
// This should match the temporary MySubmission type in TimestampListItem.vue
import type { MySubmission } from '../types/MySubmission';

import { computed } from 'vue';
import useVideoControls from '../composables/useVideoControls';
import { useMySubmissions } from '../composables/useMySubmissions';
import useEpisodeInfoQuery from '../composables/useEpisodeInfoQuery';
import { useSessionUserInfo } from '../composables/useSessionUserInfo';

// Get session user info from Player.vue or localStorage
const { userInfo } = useSessionUserInfo();

// Get episode info
const { data: episodeData } = useEpisodeInfoQuery();

const normalizedEpisodeData = computed(() => ({
  showName: episodeData.value?.showName ?? '',
  season: episodeData.value?.season ?? '',
  number: episodeData.value?.number ?? '',
}));

const { data, isLoading, error } = useMySubmissions({
  episodeData: normalizedEpisodeData,
});
const mySubmissions = computed(() => data.value ?? []);
const isError = computed(() => !!error.value);
const errorMessage = computed(() => error.value?.message || '');

// Removed imports for AmbiguousTimestamp, TimestampSource, User, MySubmission
// Removed mapping logic and related constants/maps

// Use mySubmissions directly in the template
const { currentTime } = useVideoControls();

// Removed createTimestamp import as the button is removed
</script>

<template>
  <div class="p-2">
    <!-- Loading -->
    <div v-if="isLoading" class="flex w-full aspect-square p-16">
      <span class="spinner w-8 h-8 m-auto" />
    </div>

    <!-- Error -->
    <!-- Use computed error message -->
    <p v-else-if="isError" class="p-4 text-center text-error text-sm">
      {{ errorMessage }}
    </p>

    <template v-else>
      <!-- Timestamps -->
      <table class="w-full">
        <tbody>
          <timestamp-list-item
            v-for="submission of mySubmissions"
            :key="submission.id"
            :submission="submission"
            :current-time="currentTime"
          />
        </tbody>
      </table>
      <p
        v-if="!mySubmissions || !mySubmissions.length"
        class="p-4 text-center w-full text-sm opacity-50"
      >
        No timestamps
      </p>
    </template>
  </div>
</template>
