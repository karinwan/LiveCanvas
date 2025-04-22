import { config } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';

// Create a mock i18n instance
const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      websiteInfo: {
        message: 'Welcome message',
        collaborationInfo: 'Collaboration information',
        signUpInfo: 'Sign up info'
      },
      tools: {
        toolName1: 'Tool 1',
        toolName2: 'Tool 2'
      },
      linkEntry: {
        linkText: 'Link text',
        placeholder: 'Enter link',
        buttonText: 'Submit'
      }
    }
  }
});

// Set up the global components and plugins
config.global.plugins = [i18n];

// Mock Vuetify components
config.global.components = {
  'v-layout': {
    template: '<div class="v-layout"><slot></slot></div>'
  },
  'v-container': {
    template: '<div class="v-container"><slot></slot></div>'
  },
  'v-row': {
    template: '<div class="v-row"><slot></slot></div>'
  },
  'v-col': {
    template: '<div class="v-col"><slot></slot></div>'
  },
  'v-card': {
    template: '<div class="v-card"><slot></slot></div>'
  },
  'v-card-title': {
    template: '<div class="v-card-title"><slot></slot></div>'
  },
  'v-card-text': {
    template: '<div class="v-card-text"><slot></slot></div>'
  }
};