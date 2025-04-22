<template>
  <v-dialog v-model="visible" max-width="400px">
    <v-card class="online-member-box" outlined>
      <v-card-title class="title">{{ t('online.member') }}:</v-card-title>
      <v-list>
        <v-list-item v-for="user in users" :key="user">
          <v-list-item-title>{{ user }}</v-list-item-title>
        </v-list-item>
      </v-list>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="closeOnline">{{ t("drawBoardHelp.close") }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog> 
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';

// Use i18n
const { t } = useI18n();

// Control dialog visibility (this can be bound to a parent variable via v-model)
const visible = ref(false);

// Define a prop to receive the username from the parent
const props = defineProps({
  users: {
    type: Array,
    default: () => []
  }
});

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
const closeOnline = () => {
  internalVisible.value = false;
};

</script>

<style scoped>
.online-member-box {
  width: 300px;
  border-radius: 20px;
}

.title {
  font-size: 20px;
  font-weight: bold;
}
</style>
