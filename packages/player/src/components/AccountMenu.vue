<script lang="ts" setup>
import { computed } from 'vue'; // Keep computed if needed elsewhere, or remove
import { User, createClient } from '@supabase/supabase-js'; // Import Supabase User type and client creator
// Removed computed import as it's not used

// --- Supabase Client Setup (Copied from utils/supabase.ts) ---
// TODO: Ensure this is only initialized once using a singleton pattern or provide/inject
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
if (!supabaseUrl) throw new Error('Supabase URL is not configured.');
if (!supabaseAnonKey) throw new Error('Supabase Anon Key is not configured.');
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// --- End Supabase Client Setup ---
import ProfileImage from './ProfileImage.vue';
import IconMdiOpenInNew from '~icons/mdi/open-in-new';

const props = defineProps<{
  account: User; // Change prop type to Supabase User
}>();
// Removed useTimeAgo as createdAt is not directly on Supabase User object
// Removed useAuth

// Logout function
async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error logging out:', error.message);
  } else {
    console.log('User logged out successfully.');
    // ToolbarAccount component will automatically react to SIGNED_OUT event
  }
}
</script>

<template>
  <div class="w-64">
    <div class="flex flex-col p-4 gap-4">
      <div class="flex gap-4 items-center">
        <!-- Removed joinedAgo title -->
        <profile-image class="w-12 h-12" />
        <div>
          <p
            class="text-base-content text-opacity-30 text-xs uppercase font-bold -mb-1"
          >
            Anime Skip
          </p>
          <!-- Display email, or other info if available from User object -->
          <p class="text-lg truncate font-bold" :title="account.email">
            {{ account.email }}
          </p>
        </div>
      </div>

      <!-- <p
        class="bg-neutral text-center p-2 text-sm text-neutral-content text-opacity-70 rounded"
      >
        Stats coming soon!
      </p> -->
    </div>

    <div class="h-px bg-base-content bg-opacity-20" />

    <ul class="menu menu-compact bg-base-100 w-full p-2 rounded-box">
      <li>
        <a href="https://anime-skip.com/account" target="_blank">
          <span class="flex-1">Account Settings</span>
          <icon-mdi-open-in-new class="w-4 h-4 opacity-50" />
        </a>
      </li>
      <li>
        <button @click="logout">Logout</button>
        <!-- Call logout function -->
      </li>
    </ul>
  </div>
</template>
