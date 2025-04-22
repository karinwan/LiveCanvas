import { describe, it, expect } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import mainPage from '@/pages/mainPage.vue';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { createVuetify } from 'vuetify';
import 'vuetify/styles';

const pinia = createPinia();
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      // minimally define what you need
    }
  }
});

const vuetify = createVuetify();

describe('mainPage.vue', () => {
  it('renders without crashing', () => {
    const wrapper = shallowMount(mainPage, {
      global: {
        plugins: [pinia, i18n, vuetify]
      }
    });
    expect(wrapper.exists()).toBe(true);
  });
});
