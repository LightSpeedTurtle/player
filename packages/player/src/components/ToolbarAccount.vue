<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import ToolbarModal from './ToolbarModal.vue';
import LoginForm from './LoginForm.vue';
import SignupForm from './SignupForm.vue'; // Import SignupForm
import ProfileImage from './ProfileImage.vue';
import AccountMenu from './AccountMenu.vue';
// Removed import of supabase, onAuthStateChange from '@anime-skip/player'
import { createClient, User, Subscription } from '@supabase/supabase-js'; // Import createClient, User, Subscription
import useViewOperationCompleted from '../composables/useViewOperationCompleted'; // Changed to default import

// --- Supabase Client Setup (Copied from Player.vue) ---
// TODO: Ensure this is only initialized once using a singleton pattern or provide/inject
// --- Temporarily Commented Out for Debugging Background Script Error ---
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
// if (!supabaseUrl) throw new Error('Supabase URL is not configured.');
// if (!supabaseAnonKey) throw new Error('Supabase Anon Key is not configured.');
// const supabase = createClient(supabaseUrl, supabaseAnonKey);
// --- End Temporary Comment Out ---
// TODO: This component will break until this is restored and Supabase access is properly handled
const supabase = null; // Provide a dummy value for now
// --- End Supabase Client Setup ---

const currentUser = ref<User | null>(null);
const currentView = ref<'login' | 'signup' | 'menu'>('login'); // Default to login view
let authSubscription: Subscription | null = null;

// Fetch initial user state and subscribe to changes
onMounted(async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  currentUser.value = user;
  currentView.value = user ? 'menu' : 'login'; // Show menu if logged in, else login

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('ToolbarAccount Auth Event:', event);
    currentUser.value = session?.user ?? null;
    // Switch view based on auth state
    if (event === 'SIGNED_IN') {
      currentView.value = 'menu';
      loginCompleted(); // Close modal on sign in
    } else if (event === 'SIGNED_OUT') {
      currentView.value = 'login';
    }
  });
  authSubscription = data.subscription;
});

// Unsubscribe when component is unmounted
onUnmounted(() => {
  authSubscription?.unsubscribe();
});

// Function to switch between login/signup views
function showLogin() {
  currentView.value = 'login';
}
function showSignup() {
  currentView.value = 'signup';
}

const loginCompleted = useViewOperationCompleted('account'); // Keep this line
</script>

<template>
  <toolbar-modal view="account">
    <!-- Button -->
    <template #button="{ toggle }">
      <div class="tooltip" data-tip="Account" @click="toggle">
        <profile-image
          class="w-[28px] h-[28px] m-[11px] cursor-pointer transition-all ring-base-content text-base-100 active:text-opacity-70 ring-opacity-30 ring-0 hover:ring-4 active:ring-2"
        />
      </div>
    </template>

    <!-- Modal -->
    <template #modal>
      <!-- Render based on user state and current view -->
      <account-menu
        v-if="currentUser && currentView === 'menu'"
        :account="currentUser"
      />
      <login-form
        v-else-if="!currentUser && currentView === 'login'"
        class="p-4 w-80"
        @logged-in="loginCompleted"
        @switchToSignup="showSignup"
      />
      <!-- Moved comment outside -->
      <signup-form
        v-else-if="!currentUser && currentView === 'signup'"
        class="p-4 w-80"
        @signedUp="showLogin"
        @switchToLogin="showLogin"
      />
      <!-- Moved comment outside -->
    </template>
  </toolbar-modal>
</template>
