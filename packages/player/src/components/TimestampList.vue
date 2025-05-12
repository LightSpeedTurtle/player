<script lang="ts" setup>
import TimestampListItem from './TimestampListItem.vue';
import IconPlus from '~icons/anime-skip/plus';
import IconMdiToggleSwitch from '~icons/mdi/toggle-switch';
import IconMdiToggleSwitchOff from '~icons/mdi/toggle-switch-off';

// Define a mock type for mySubmissions
// This should match the temporary MySubmission type in TimestampListItem.vue
import type { MySubmission } from '../types/MySubmission';

import { computed, ref } from 'vue';
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

// Track test mode state in the UI
const isTestModeEnabled = ref(false);

// Initialize useMySubmissions with test mode state
const { data, isLoading, error, toggleTestMode } = useMySubmissions({
  episodeData: normalizedEpisodeData,
  testMode: isTestModeEnabled.value,
});

const mySubmissions = computed(() => data.value ?? []);
const isError = computed(() => !!error.value);
const errorMessage = computed(() => error.value?.message || '');

// Toggle test mode handler
function handleToggleTestMode() {
  isTestModeEnabled.value = !isTestModeEnabled.value;
  toggleTestMode();
}

// Use mySubmissions directly in the template
const { currentTime } = useVideoControls();
</script>

<template>
  <div class="p-2">
    <!-- Admin Controls -->
    <div
      class="mb-4 flex items-center justify-between bg-neutral-800 rounded-lg p-2"
    >
      <!-- Test Mode Toggle -->
      <button
        @click="handleToggleTestMode"
        class="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-neutral-700"
        :class="{ 'text-primary': isTestModeEnabled }"
        title="Toggle test mode - bypasses filters to show all timestamps for debugging"
      >
        <template v-if="isTestModeEnabled">
          <IconMdiToggleSwitch class="w-6 h-6" />
          <span class="text-xs">Test Mode ON</span>
        </template>
        <template v-else>
          <IconMdiToggleSwitchOff class="w-6 h-6" />
          <span class="text-xs">Test Mode OFF</span>
        </template>
      </button>

      <!-- Submission Count -->
      <span class="text-xs opacity-70">
        {{ mySubmissions.length || 0 }} timestamp{{
          mySubmissions.length !== 1 ? 's' : ''
        }}
      </span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex w-full aspect-square p-16">
      <span class="spinner w-8 h-8 m-auto" />
    </div>

    <!-- Error -->
    <p v-else-if="isError" class="p-4 text-center text-error text-sm">
      {{ errorMessage }}
    </p>

    <template v-else>
      <!-- Test Mode Indicator -->
      <div
        v-if="isTestModeEnabled"
        class="mb-3 p-2 bg-primary bg-opacity-20 text-primary-content rounded-md"
      >
        <p class="text-xs text-center font-medium">
          Test Mode Active: Showing all timestamps regardless of filters
        </p>
      </div>

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

      <!-- No Timestamps Message -->
      <p
        v-if="!mySubmissions || !mySubmissions.length"
        class="p-4 text-center w-full text-sm opacity-50"
      >
        No timestamps found
      </p>
    </template>
  </div>
</template>
