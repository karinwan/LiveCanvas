<template>
  <v-dialog v-model="visible" max-width="400px">
    <v-card class="export-link-box" elevation="2">
      <v-card-text>
        <v-row align="center" class="mb-4">
          <v-col>
            <div class="label-text">{{ t('export.link') }}</div>
            <v-text-field
              v-model="currentPageLink"
              readonly
              hide-details
              outlined
              dense
              style="width: 350px;"
            ></v-text-field>
          </v-col>
          <v-col cols="auto" class="d-flex align-end">
            <v-btn color="primary" @click="copyLink">
              {{ t('export.copy') }}
            </v-btn>
          </v-col>
        </v-row>

        <v-row align="center">
          <v-col>
            <div class="label-text">{{ t('export.roomId') }}</div>
            <v-text-field
              :value="roomId"
              readonly
              hide-details
              outlined
              dense
              style="width: 350px;"
            ></v-text-field>
          </v-col>
          <v-col cols="auto" class="d-flex align-end">
            <v-btn color="primary" @click="copyRoomId">
              {{ t('export.copyId') }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions style="position: absolute; right: 8px; bottom: 8px;">
        <v-spacer />
        <v-btn color="primary" @click="closeExport">{{ t("drawBoardHelp.close") }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed} from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Control dialog visibility (this can be bound to a parent variable via v-model)
const visible = ref(false);

const currentPageLink = ref(window.location.href);

const props = defineProps({
  roomId: {
    type: String,
    default: ''
  }
});

function copyLink() {
  navigator.clipboard.writeText(currentPageLink.value).then(() => {
    alert('Link copied!');
  });
}

function copyRoomId() {
  navigator.clipboard.writeText(props.roomId).then(() => {
    alert('Room ID copied!');
  });
}

// Emit event to update parent's v-model binding.
const emit = defineEmits(['update:modelValue']);

// Create a computed variable that gets/sets the modelValue.
const internalVisible = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit('update:modelValue', value);
  },
});

// Function to close the dialog.
const closeExport = () => {
  internalVisible.value = false;
};
</script>

<style scoped>
.export-link-box {
  width: 400px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.label-text {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 6px;
}
</style>
