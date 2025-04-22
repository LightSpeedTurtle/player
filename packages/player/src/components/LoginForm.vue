<script lang="ts" setup>
import { ref } from 'vue'; // Import ref
import IconAccount from '~icons/anime-skip/account';
import IconPassword from '~icons/anime-skip/password';
import IconMdiOpenInNew from '~icons/mdi/open-in-new';
// Removed md5 import - DO NOT HASH PASSWORDS CLIENT-SIDE
// Import Supabase client creator directly
import { createClient } from '@supabase/supabase-js';

// --- Supabase Client Setup (Copied from utils/supabase.ts) ---
// TODO: Ensure this is only initialized once using a singleton pattern or provide/inject
const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY as string;
if (!supabaseUrl) throw new Error('Supabase URL is not configured.');
if (!supabaseAnonKey) throw new Error('Supabase Anon Key is not configured.');
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// --- End Supabase Client Setup ---

const emits = defineEmits<{
  (event: 'loggedIn'): void;
  (event: 'switchToSignup'): void; // Add event to switch to signup view
}>();

// Removed useAuth - Supabase handles session state

const username = ref('');
const password = ref('');

// Removed useLoginMutation - Using Supabase directly
const isLoading = ref(false);
const supabaseError = ref<string | null>(null);
const validationError = ref<string | undefined>(); // Declare validationError here

async function login() {
  // Make function async
  const email = username.value.trim(); // Assuming username input is used for email
  const passwordValue = password.value.trim(); // Use plain password
  username.value = email; // Keep trimmed value in input
  // Do not store plain password back in ref after trimming if not needed

  // Basic validation
  if (!email) {
    validationError.value = 'You must enter an email.';
    return;
  } else if (!passwordValue) {
    validationError.value = 'You must enter a password.';
    return;
  }

  validationError.value = undefined; // Clear previous validation errors
  supabaseError.value = null; // Clear previous supabase errors
  isLoading.value = true; // Set loading state

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: passwordValue,
    });

    if (error) {
      console.error('Supabase login error:', error.message);
      supabaseError.value = error.message; // Display Supabase error
    } else if (data.user) {
      // Login successful! Supabase session is automatically handled.
      console.log('Supabase login successful:', data.user.email);
      // No need to manually set auth state like before
      // auth.value = {
      //   refreshToken: data.login.refreshToken, // Supabase manages tokens
      //   token: data.login.authToken,
      //   account: data.login.account, // Get user details via supabase.auth.user() if needed
      // };
      emits('loggedIn'); // Emit event to notify parent component
    } else {
      // Should not happen if error is null and user is null, but handle defensively
      supabaseError.value = 'An unexpected error occurred during login.';
    }
  } catch (err: any) {
    console.error('Unexpected error during login:', err);
    supabaseError.value = err.message || 'An unexpected error occurred.';
  } finally {
    isLoading.value = false; // Reset loading state
  } // This closes the finally block
} // This closes the login function

// Removed misplaced validationError declaration
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="login">
    <!-- Header -->
    <div>
      <h3 class="text-base-content font-bold text-opacity-90 text-lg">
        Log in to Anime Skip
      </h3>
    </div>

    <!-- Username -->
    <div class="form-control">
      <label class="input-group">
        <span>
          <icon-account />
        </span>
        <input
          class="w-full input input-bordered focus:input-primary"
          type="text"
          autocomplete="username"
          placeholder="Username or email"
          v-model="username"
          @keydown.stop
        />
      </label>
    </div>

    <!-- Password -->
    <div class="form-control">
      <label class="input-group">
        <span>
          <icon-password />
        </span>
        <input
          class="w-full input input-bordered focus:input-primary"
          type="password"
          autocomplete="current-password"
          placeholder="Password"
          v-model="password"
          @keydown.stop
        />
      </label>
    </div>

    <!-- Display validation or Supabase errors -->
    <p
      v-if="validationError || supabaseError"
      class="text-error text-sm text-center"
    >
      {{ validationError || supabaseError }}
    </p>

    <!-- Buttons -->
    <div class="flex gap-4 flex-row-reverse">
      <button
        class="flex-1 btn btn-primary"
        :class="{ loading: isLoading }"
        :disabled="isLoading"
        type="submit"
      >
        Login
      </button>
      <!-- Changed link to button emitting event -->
      <button
        type="button"
        class="flex-1 btn btn-ghost gap-2"
        @click="emits('switchToSignup')"
      >
        Sign Up
      </button>
    </div>
  </form>
</template>
