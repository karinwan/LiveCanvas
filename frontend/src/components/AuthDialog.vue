<template>
  <div v-if="props.showDialog" class="container">
    <div class="card">
      <h2 class="title">{{ t('uiElements.enterUsername') }}</h2>
      <div class="input-group">
        <input 
          v-model="username" 
          class="input" 
          :placeholder="t('uiElements.usernamePlaceholder')" 
          @keyup.enter="handleSubmit"
        />
        <button class="button" @click="handleSubmit">
          {{ t('uiElements.enterButtonText') }}
        </button>
      </div>
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>
  
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
  
const { t } = useI18n()
const props = defineProps<{ showDialog: boolean, redirectPath?: string }>()
const emit = defineEmits(['auth-complete'])
  
const username = ref('')
const error = ref('')
const router = useRouter()

watch(() => props.showDialog, (newVal) => {
  if (!newVal) {
    username.value = ''
    error.value = ''
  }
})
  
const handleSubmit = () => {
  if (!username.value.trim()) {
    error.value = t('uiElements.usernameRequired')
    return
  }
    
  emit('auth-complete', username.value)
  
}
</script>
  
  <style scoped>
  .container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
  }
  
  .card {
    width: 400px;
    background: #F6F2F8;
    border-radius: 16px;
    padding: 40px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    animation: scaleIn 0.3s ease;
  }
  
  @keyframes scaleIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  .input-group {
    background: #F0EAF3;
    border-radius: 8px;
    padding: 8px;
    display: flex;
    gap: 8px;
  }
  
  .input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 8px;
    font-size: 16px;
    color: #000;
  }
  
  .input:focus {
    outline: none;
  }
  
  .button {
    background: #6B5B95;
    color: white;
    border: none;
    border-radius: 20px;
    padding: 8px 20px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.3s;
  }
  
  .button:hover {
    background: #5D4E82;
  }
  
  .error-message {
    color: #ff4444;
    font-size: 0.875rem;
    margin-top: 12px;
    padding-left: 8px;
    height: 20px;
  }
  </style>