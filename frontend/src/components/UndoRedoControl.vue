<template>
  <v-card class="undo-redo-controls" style="border:1px;padding: 10px; border-radius: 24px">
    <v-btn icon
           @click="$emit('undo')"
           data-testid="undo-button"
           :disabled="isLoading"
           density="comfortable"
           variant="text">
      <v-icon>mdi-undo</v-icon>
    </v-btn>
    <v-btn icon
           @click="$emit('redo')"
           data-testid="redo-button"
           :disabled="isLoading"
           density="comfortable"
           variant="text">
      <v-icon>mdi-redo</v-icon>
    </v-btn>
  </v-card>
</template>

<script setup lang="ts">
const props = defineProps({
  isLoading: {
    type: Boolean,
    required: true,
  },
});
</script>
