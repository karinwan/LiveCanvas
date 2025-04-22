<script lang="ts" setup>
import { computed } from 'vue';
import { ref } from 'vue';
import { useTheme } from 'vuetify';
import { useI18n } from 'vue-i18n';
import RoomName from '@/components/RoomName.vue';

const { locale, t } = useI18n();
const emit = defineEmits(['openFileDialog', 'exportToJson', 'exportToImage', 'exportToPdf', 'openHelp', 'backToHome']);
const showMenu = ref(false);
const theme = useTheme();
const isDark = computed({
  get: () => theme.global.name.value === 'dark',
  set: (value) => {
    theme.global.name.value = value ? 'dark' : 'light';
  }
});
const props = defineProps<{
  roomId: string;
}>();

const menuItems = ref([
  { title: 'sidebar.home', 
    icon: 'mdi-home',
    hasSubMenu: false,
    subMenuItems: [] 
  },
  { title: 'sidebar.open', 
    icon: 'mdi-folder-open-outline',
    hasSubMenu: false,
    subMenuItems: [] 
  },
  { 
    title: 'sidebar.export', 
    icon: 'mdi-export',
    hasSubMenu: true,
    subMenuItems: [ 
      { title: 'export.toJson' },
      { title: 'export.toImage' },
      { title: 'export.toPdf' }
    ]
  },
  { 
    title: 'sidebar.language', 
    icon: 'mdi-translate', 
    hasSubMenu: true,
    subMenuItems: [
      { title: 'language.en', locale: 'en' },
      { title: 'language.fr', locale: 'fr' }
    ]
  },
  { title: 'sidebar.help', 
    icon: 'mdi-help-circle-outline',
    hasSubMenu: false,
    subMenuItems: [] 
  },
]);
  
const switchLang = (lang: string) => {
  locale.value = lang
  localStorage.setItem('userLang', lang)
  console.log(`Language switched to: ${lang}`);
}

function handleMenuItemClick(item: { title: any; hasSubMenu: any; }) {
  console.log('Clicked on:', item.title);
  if (item.hasSubMenu) {
    return;
  }
  if (item.title === 'sidebar.home') {
    emit('backToHome');
  } else if (item.title === 'sidebar.open') {
    emit('openFileDialog');
  } else if (item.title === 'sidebar.help') {
    emit('openHelp');
  }
  showMenu.value = false;
}

function handleSubMenuClick(parentTitle: string, subItem: { title: any; locale: string; }) {
  console.log(`Clicked on submenu item: ${subItem.title} (Parent: ${parentTitle})`);

  if (parentTitle === 'sidebar.language') {
    switchLang(subItem.locale);
  } else if (parentTitle === 'sidebar.export') {
    if (subItem.title === 'export.toJson') {
      emit('exportToJson');
    } else if (subItem.title === 'export.toImage') {
      emit('exportToImage');
    } else if (subItem.title === 'export.toPdf') {
      emit('exportToPdf');
    }
  }

  showMenu.value = false; 
}

</script>

<template>
  <v-menu 
    v-model="showMenu" 
    transition="scale-transition" 
    :close-on-content-click="false" 
    offset-y
  >
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" icon>
        <v-icon color = "on-surface">mdi-menu</v-icon>
      </v-btn>
    </template>
  
    <v-card class="bg-surface text-on-surface">
      <v-list>
        <v-list-item class="align-start pa-1 pt-1">
          <RoomName :roomId="roomId" />
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item 
          v-for="item in menuItems" 
          :key="item.title" 
          :prepend-icon="item.icon" 
          :title="t(item.title)"
          @click="handleMenuItemClick(item)"
        >

          <template v-if="item.hasSubMenu" v-slot:append>
            <v-icon icon="mdi-menu-right"></v-icon>
          </template>

          <v-menu 
            :open-on-focus="false" 
            activator="parent" 
            open-on-hover 
            submenu
          >
            <v-list>
              <v-list-item 
                v-for="subItem in item.subMenuItems" 
                :key="subItem.title" 
                :title="t(subItem.title)"
                link
                @click="handleSubMenuClick(item.title, subItem)"
              >
              </v-list-item>
            </v-list>
          </v-menu>
          
        </v-list-item>

        <v-divider></v-divider>

        <v-list-item>
          <v-list-item-title>{{ t('sidebar.mode') }}</v-list-item-title>
          <template v-slot:append>
            <v-switch
              v-model="isDark"
              inset
              hide-details
            >
              <template v-slot:thumb>
                <v-icon>{{ isDark ? 'mdi-weather-night' : 'mdi-white-balance-sunny' }}</v-icon>
              </template>
            </v-switch>
          </template>
        </v-list-item>
        <!-- <v-list-item>
          <template v-slot:append>
            <v-btn icon="mdi-theme-light-dark" @click="toggleTheme"></v-btn>
          </template>
        </v-list-item> -->
      </v-list>
    </v-card>
  </v-menu>
</template>
