<script lang="ts" setup>
import { ref } from 'vue';
import IconAccount from '~icons/anime-skip/account';
import IconPassword from '~icons/anime-skip/password';
// Import Supabase client creator directly
import { createClient } from '@supabase/supabase-js';

// --- Supabase Client Setup (Copied from utils/supabase.ts) ---
// TODO: Ensure this is only initialized once using a singleton pattern or provide/inject
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
if (!supabaseUrl) throw new Error('Supabase URL is not configured.');
if (!supabaseAnonKey) throw new Error('Supabase Anon Key is not configured.');
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// --- End Supabase Client Setup ---

const emits = defineEmits<{
  (event: 'signedUp'): void; // Event after successful signup (confirmation might be needed)
  (event: 'switchToLogin'): void; // Event to switch back to login view
}>();

const email = ref('');
const password = ref('');
const passwordConfirm = ref('');

const isLoading = ref(false);
const supabaseError = ref<string | null>(null);
const validationError = ref<string | undefined>();
const successMessage = ref<string | null>(null); // For confirmation message

async function signup() {
  // Basic validation
  validationError.value = undefined;
  supabaseError.value = null;
  successMessage.value = null;

  if (!email.value) {
    validationError.value = 'Please enter an email address.';
    return;
  }
  if (!password.value) {
    validationError.value = 'Please enter a password.';
    return;
  }
  if (password.value !== passwordConfirm.value) {
    validationError.value = 'Passwords do not match.';
    return;
  }
  // Add more robust password validation if needed (length, complexity)

  isLoading.value = true;

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value, // Send plain password to Supabase
      // options: {
      //   // Add emailRedirectTo if you want email confirmation link to go somewhere specific
      //   // emailRedirectTo: 'YOUR_CONFIRMATION_URL',
      //   // data: { /* Optional metadata */ }
      // }
    });

    if (error) {
      console.error('Supabase signup error:', error.message);
      supabaseError.value = error.message;
    } else if (data.user?.identities?.length === 0) {
      // Handle case where user exists but confirmation is needed again (configurable in Supabase)
      console.warn('User already exists, confirmation email possibly resent.');
      supabaseError.value =
        'This email is already registered. Check your inbox for a confirmation link or try logging in.';
      // Or potentially treat as success and show confirmation message
    } else if (data.user) {
      // Signup successful! Check Supabase settings for email confirmation requirement.
      console.log('Supabase signup initiated for:', data.user.email);
      successMessage.value =
        'Signup successful! Please check your email for a confirmation link.';
      // Optionally emit 'signedUp' or automatically switch view after a delay
      // emits('signedUp');
    } else {
      supabaseError.value = 'An unexpected error occurred during sign up.';
    }
  } catch (err: any) {
    console.error('Unexpected error during signup:', err);
    supabaseError.value = err.message || 'An unexpected error occurred.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="signup">
    <!-- Header -->
    <div>
      <h3 class="text-base-content font-bold text-opacity-90 text-lg">
        Sign Up
      </h3>
      <p class="text-sm text-base-content text-opacity-70">
        Create an account to save your preferences.
      </p>
    </div>

    <!-- Email -->
    <div class="form-control">
      <label class="input-group">
        <span>
          <icon-account />
        </span>
        <input
          class="w-full input input-bordered focus:input-primary"
          type="email"
          autocomplete="email"
          placeholder="Email"
          v-model="email"
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
          autocomplete="new-password"
          placeholder="Password"
          v-model="password"
          @keydown.stop
        />
      </label>
    </div>

    <!-- Confirm Password -->
    <div class="form-control">
      <label class="input-group">
        <span>
          <icon-password />
        </span>
        <input
          class="w-full input input-bordered focus:input-primary"
          type="password"
          autocomplete="new-password"
          placeholder="Confirm Password"
          v-model="passwordConfirm"
          @keydown.stop
        />
      </label>
    </div>

    <!-- Display validation, Supabase errors, or success message -->
    <p
      v-if="validationError || supabaseError"
      class="text-error text-sm text-center"
    >
      {{ validationError || supabaseError }}
    </p>
    <p v-if="successMessage" class="text-success text-sm text-center">
      {{ successMessage }}
    </p>

    <!-- Buttons -->
    <div class="flex gap-4 flex-col">
      <button
        class="w-full btn btn-primary"
        :class="{ loading: isLoading }"
        :disabled="isLoading"
        type="submit"
      >
        Sign Up
      </button>
      <button
        type="button"
        class="w-full btn btn-ghost text-sm"
        @click="emits('switchToLogin')"
      >
        Already have an account? Log In
      </button>
    </div>
  </form>
</template>
