<template>
  <v-card class="zoom-controls" style="border:1px;padding: 10px; border-radius: 24px">
    <v-btn icon
           @click="zoomOut"
           density="comfortable"
           variant="text">
      <v-icon>mdi-minus</v-icon>
    </v-btn>
    <span class="zoom-percentage">{{ Math.round(localZoom * 100) }}%</span>
    <v-btn icon
           @click="zoomIn"
           density="comfortable"
           variant="text">
      <v-icon>mdi-plus</v-icon>
    </v-btn>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps({
  // Current zoom level from parent
  zoom: {
    type: Number,
    default: 1,
  },
});

const emit = defineEmits(['zoom-change']);

// Local reactive zoom value for button actions and display
const localZoom = ref(props.zoom);

// Sync localZoom with any changes from the parent (e.g. via mouse wheel zoom)
watch(() => props.zoom, (newZoom) => {
  localZoom.value = newZoom;
});

// Increase zoom level (capped at 5)
const zoomIn = () => {
  localZoom.value = Math.min(localZoom.value + 0.1, 5);
  emit('zoom-change', localZoom.value);
};

// Decrease zoom level (bottom limit at 0.2)
const zoomOut = () => {
  localZoom.value = Math.max(localZoom.value - 0.1, 0.2);
  emit('zoom-change', localZoom.value);
};
</script>
