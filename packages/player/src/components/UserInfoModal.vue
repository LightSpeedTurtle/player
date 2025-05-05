<template>
  <div v-if="visible" class="modal modal-open">
    <div class="modal-box relative flex flex-col gap-4">
      <!-- Close Button -->
      <button
        type="button"
        class="btn btn-sm btn-circle absolute right-2 top-2"
        @click="emit('close')"
        title="Close"
      >
        ✕
      </button>
      <h3 class="font-bold text-lg">Enter Your Info</h3>
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">First Name</span>
        </label>
        <input
          v-model="firstName"
          placeholder="First Name"
          class="input input-bordered w-full"
          @keyup.enter="save"
        />
      </div>
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Phone Number</span>
        </label>
        <input
          v-model="phone"
          placeholder="Digits only, 7-15 digits"
          @keyup.enter="save"
          class="input input-bordered w-full"
        />
      </div>
      <button class="btn btn-primary w-full" @click="save">Save</button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * UserInfoModal.vue
 *
 * Modal dialog for collecting and validating the user's phone number.
 * - If the phone number is missing from localStorage, this modal is shown.
 * - On valid input, saves the phone number to localStorage under 'sessionUserInfo'.
 * - Emits a 'close' event when the user saves, so the parent can re-check and reload if needed.
 *
 * Integration: See DOCUMENTATION.md for details on how this modal is used in SidePanel.vue.
 */
import { ref, watch, defineProps, defineEmits } from 'vue';
const props = defineProps<{ visible: boolean }>();
const emit = defineEmits(['close']);

// Phone number input (digits only)
const firstName = ref('');
const phone = ref('');

/**
 * Save the user info to localStorage if valid, then emit close.
 * First name must not be empty, phone must be digits only (7-15 digits).
 */
function save() {
  const normalized = phone.value.replace(/\D/g, '');
  if (!firstName.value.trim()) {
    alert('Please enter your first name.');
    return;
  }
  if (!normalized || !/^\d{7,15}$/.test(normalized)) {
    alert('Please enter a valid phone number (digits only, 7-15 digits).');
    return;
  }
  localStorage.setItem(
    'animeSkipSessionUserInfo',
    JSON.stringify({ firstName: firstName.value.trim(), phone: normalized }),
  );
  emit('close');
}

// Reset inputs when modal is shown
watch(
  () => props.visible,
  (val) => {
    if (val) {
      firstName.value = '';
      phone.value = '';
    }
  },
);
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2);
  min-width: 320px;
  text-align: center;
}
input {
  margin-bottom: 1rem;
  padding: 0.5rem;
  width: 80%;
  font-size: 1.1rem;
}
button {
  padding: 0.5rem 1.5rem;
  font-size: 1.1rem;
  border: none;
  background: #007bff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background: #0056b3;
}
</style>
