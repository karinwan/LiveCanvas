<template>
  <!-- Confirmation Dialog for Board Clearing -->
  <v-dialog v-model="showClearDialog" max-width="400">
    <v-card>
      <v-card-title class="text-warning">
        {{ t('drawingBoard.confirmClearTitle') || 'Clear Board' }}
      </v-card-title>
      
      <v-card-text>
        {{ t('drawingBoard.confirmClear') || 'Are you sure you want to clear the entire board? This action cannot be undone.' }}
      </v-card-text>
      
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="grey"
          variant="text"
          @click="handleCancel"
        >
          {{ t('uiElements.cancelButton') || 'Cancel' }}
        </v-btn>
        <v-btn
          color="error"
          variant="elevated"
          @click="handleConfirm"
        >
          {{ t('uiElements.clearButton') || 'Clear' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  showClearDialog: boolean;
}>();
const emit = defineEmits<{
  (e: 'update:showClearDialog', value: boolean): void;
  (e: 'confirmClear'): void;
}>();

const { t } = useI18n();

const handleCancel = () => {
  emit('update:showClearDialog', false);
};

const handleConfirm = () => {
  emit('update:showClearDialog', false);
  emit('confirmClear');
};
</script>
