// import './assets/main.css'

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import i18n from './i18n'//
const app = createApp(App);

// set up vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { lightTheme, darkTheme } from '@/theme';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import '@mdi/font/css/materialdesignicons.css';

const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: lightTheme,
      dark: darkTheme
    }
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  components,
  directives,
});
app.use(vuetify);

// setup global api
import ApiWrapper from '@/api/index';
const api = new ApiWrapper();
app.config.globalProperties.$api = api;

app.use(createPinia());
app.use(router);
app.use(i18n);
app.mount('#app');
