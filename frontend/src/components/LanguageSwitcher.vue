<template>
  <div class="language-switcher">
    <v-menu offset-y>
      <template v-slot:activator="{ props }">
        <v-btn v-bind="props"
               class="lang-btn"
               rounded="xl"
               variant="tonal">
          {{ currentLanguageName }}
          <v-icon>mdi-chevron-down</v-icon>
        </v-btn>
      </template>

      <v-list>
        <v-list-item 
          v-for="lang in availableLangs" 
          :key="lang" 
          @click="switchLang(lang)"
        >
          <v-list-item-title>
            <span :class="{ 'active': locale === lang }">
              {{ t(`language.${lang}`) }}
            </span>
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

  
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale, t } = useI18n()
const availableLangs = ['en', 'fr']

const currentLanguageName = computed(() => t(`language.${locale.value}`))

const switchLang = (lang: string) => {
  locale.value = lang
  localStorage.setItem('userLang', lang)
}
</script>

<style scoped>

.language-switcher {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 1000;
}


.lang-btn {
  text-transform: none;
  padding: 8px 16px;
  font-weight: 500;
}

.active {
  font-weight: bold;
  color: var(--v-theme-primary);
}
</style>
