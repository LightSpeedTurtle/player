<script lang="ts" setup>
import { ref } from 'vue';

const emits = defineEmits<{
  (event: 'submit', info: { firstName: string; phone: string }): void;
}>();

const firstName = ref('');
const phone = ref('');
const error = ref('');

function handleSubmit() {
  if (!firstName.value.trim() || !phone.value.trim()) {
    error.value = 'Please enter both your first name and phone number.';
    return;
  }
  error.value = '';
  emits('submit', {
    firstName: firstName.value.trim(),
    phone: phone.value.trim(),
  });
}
</script>

<template>
  <div class="modal modal-open">
    <div class="modal-box flex flex-col gap-4">
      <h3 class="font-bold text-lg">Enter Your Info</h3>
      <div class="form-control">
        <label class="label">
          <span class="label-text">First Name</span>
        </label>
        <input
          v-model="firstName"
          class="input input-bordered"
          placeholder="First Name"
        />
      </div>
      <div class="form-control">
        <label class="label">
          <span class="label-text">Phone Number</span>
        </label>
        <input
          v-model="phone"
          class="input input-bordered"
          placeholder="Phone Number"
        />
      </div>
      <div v-if="error" class="text-error">{{ error }}</div>
      <button class="btn btn-primary" @click="handleSubmit">Continue</button>
    </div>
  </div>
</template>
