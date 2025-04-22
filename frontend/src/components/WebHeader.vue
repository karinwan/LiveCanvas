<script lang="ts" setup>
import { useTheme } from 'vuetify'
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const theme = useTheme()

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
  if (theme.global.current.value.dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}
</script>

<template>
  <v-app-bar color="primary">
    <v-toolbar-title>{{ t('websiteInfo.websiteName') }}</v-toolbar-title>
    <template v-slot:append>
      <v-btn icon="mdi-theme-light-dark" @click="toggleTheme"></v-btn>
    </template>
  </v-app-bar>

</template>
