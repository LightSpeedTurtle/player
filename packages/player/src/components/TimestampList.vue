<script lang="ts" setup>
import { computed } from 'vue'; // Import computed
import TimestampListItem from './TimestampListItem.vue';
import IconPlus from '~icons/anime-skip/plus';
import { useMySubmissions } from '../composables/useMySubmissions'; // Import the new composable directly
// Use the new composable to fetch the user's submissions for this episode
const {
  data: mySubmissions,
  isLoading,
  error,
  refetch: refetchMySubmissions,
} = useMySubmissions(); // Get refetch function
const isError = computed(() => !!error.value);
const errorMessage = computed(
  () => error.value?.message || 'Failed to load your submissions',
);

// Removed imports for AmbiguousTimestamp, TimestampSource, User, MySubmission
// Removed mapping logic and related constants/maps

// Use mySubmissions directly in the template

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
        <!-- Iterate over mySubmissions directly -->
        <!-- TODO: Update TimestampListItem to accept 'submission' prop of type MySubmission -->
        <timestamp-list-item
          v-for="submission of mySubmissions"
          :key="submission.id"
          :submission="submission"
        />
      </table>

      <!-- Empty -->
      <p v-if="!mySubmissions || !mySubmissions.length">
        <!-- Check mySubmissions directly -->
        class="p-4 text-center w-full text-sm opacity-50" > No timestmaps
      </p>

      <!-- "Add Timestamp" button removed - use the tool in the Toolbar -->
    </template>
  </div>
</template>
