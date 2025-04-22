<script lang="ts" setup>
import { Scalars } from '../utils/api';
import { formatTimestampInS } from '../utils/time-utils';
import {
  AmbiguousTimestamp,
  UNKNOWN_TIMESTAMP_TYPE_ID,
} from '../utils/timestamp-utils';
import IconMdiClock from '~icons/mdi/clock';
import IconFilter from '~icons/anime-skip/filter';
import IconMdiRadioBlank from '~icons/mdi/radiobox-blank';
import IconMdiRadioMarked from '~icons/mdi/radiobox-marked';

const props = defineProps<{
  timestamp: AmbiguousTimestamp;
}>();

const emits = defineEmits<{
  (event: 'update:timestamp', newTimestamp: AmbiguousTimestamp): void;
}>();

const filterInput = ref<HTMLInputElement>();
function focusOnFilter() {
  filterInput.value?.focus();
}

const timestamp = useVModel(props, 'timestamp', emits);
const at = computed(() => formatTimestampInS(timestamp.value.at, true));

const atBtn = ref<HTMLButtonElement>();
function focusOnAt() {
  atBtn.value?.focus();
}
onMounted(focusOnAt);

const typeId = computed<Scalars['ID']>({
  get() {
    return timestamp.value.typeId;
  },
  set(typeId) {
    timestamp.value = { ...toRaw(timestamp.value), typeId };
  },
});

// Removed GraphQL query for types
// const { data: types, isLoading, error, isError } = useAllTimestampTypesQuery();
// const errorMessage = useErrorMessage(error);

// Define the available content types based on Supabase schema
// TODO: Consider making this dynamic if types are stored in DB
const availableTypes = [
  {
    id: 'suggestive',
    name: 'Suggestive',
    description: 'Content that is suggestive.',
  },
  { id: 'nudity', name: 'Nudity', description: 'Content containing nudity.' },
  {
    id: 'sexual_acts',
    name: 'Sexual Acts',
    description: 'Content depicting sexual acts.',
  },
  // Add other types if defined
];
const typeSearch = ref('');
// Fuzzy search based on the hardcoded list
const typeSearchResults = useFuzzySearch(
  typeSearch,
  ref(availableTypes),
  (t) => t.name,
); // Wrap availableTypes in ref for fuzzy search

// Update the computed property for typeId to work with string types from Supabase
// Note: The prop 'timestamp' still uses AmbiguousTimestamp which expects typeId (UUID).
// This component might need significant refactoring if it's meant to edit Supabase submissions directly.
// For now, we adapt the type selection, but saving logic needs review in the parent.
const selectedType = computed<string>({
  // Change type to string
  get() {
    // Find the name corresponding to the current timestamp's typeId (this mapping is complex now)
    // This part needs rethinking based on how parent manages the timestamp object being edited.
    // Returning a placeholder for now.
    const currentType = availableTypes.find(
      (t) => t.id === timestamp.value.typeId,
    ); // This comparison won't work directly (string vs UUID)
    return currentType?.id ?? availableTypes[0].id; // Default to first available type string
  },
  set(typeStringId) {
    // Find the corresponding internal UUID typeId based on the selected string
    // This requires the reverse mapping (string -> UUID) which we don't have easily here.
    // Emitting the string type for now, parent needs to handle conversion if necessary.
    // OR: Refactor this component to work directly with the Supabase submission structure.
    console.warn(
      `Setting type to string '${typeStringId}'. Parent needs to handle potential mapping to UUID typeId if required.`,
    );
    // This update might break if the parent expects a full AmbiguousTimestamp object update
    timestamp.value = { ...toRaw(timestamp.value), typeId: typeStringId }; // Temporarily setting typeId to the string value
  },
});

// Reset the selected type on change based on search results
watch(typeSearchResults, (newResults) => {
  // Set selectedType (string) based on the first search result's id (string)
  selectedType.value = newResults[0]?.id ?? availableTypes[0].id;
});

function onKeyDown(event: KeyboardEvent) {
  const increments: Record<string, number> = {
    ArrowUp: -1,
    ArrowDown: 1,
  };
  const increment = increments[event.key];
  if (!increment) return;

  // Removed original index calculation based on typeId
  const currentSelectionId = selectedType.value; // Use the string type
  // Find index based on the string ID
  const index = typeSearchResults.value.findIndex(
    (t) => t.id === currentSelectionId,
  );
  if (index === -1) return; // Should not happen

  let newIndex = index + increment;
  // Basic bounds check
  if (newIndex < 0) newIndex = 0;
  if (newIndex >= typeSearchResults.value.length)
    newIndex = typeSearchResults.value.length - 1;

  selectedType.value = typeSearchResults.value[newIndex].id; // Update the string type
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <!-- At -->
    <button
      ref="atBtn"
      class="btn btn-lg gap-4 focus:btn-primary"
      type="button"
      @click="focusOnAt"
      @keydown.tab.prevent="focusOnFilter()"
    >
      <icon-mdi-clock class="w-6 h-6" />
      <span class="flex-1 text-left">{{ at }}</span>
    </button>

    <div class="flex flex-col gap-4" @keydown.stop="onKeyDown">
      <!-- Search types input -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">Timestamp Type</span>
        </label>
        <label class="input-group">
          <span><icon-filter class="w-6 h-6" /></span>
          <input
            ref="filterInput"
            class="input input-bordered focus:input-primary w-full"
            v-model="typeSearch"
            placeholder="Filter..."
            @keydown.enter.prevent
          />
        </label>
      </div>

      <!-- List of types -->
      <ul class="menu menu-compact gap-1">
        <li
          v-for="item of typeSearchResults"
          :key="item.id"
          :title="item.description"
        >
          <button
            class="rounded px-2"
            :class="{ active: selectedType === item.id }"
          >
            <!-- Use selectedType (string) -->
            type="button" @click="selectedType = item.id" ><!-- Use selectedType (string) -->
            tabindex="-1" >
            <icon-mdi-radio-marked
              v-if="selectedType === item.id"
              class="w-5 h-5"
            />
            <!-- Use selectedType (string) -->
            <icon-mdi-radio-blank
              v-else
              class="w-5 h-5 text-base-content text-opacity-50"
            />
            <span>{{ item.name }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
