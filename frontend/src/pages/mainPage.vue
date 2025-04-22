<script setup lang="ts">
import WebHeader from '@/components/WebHeader.vue';
import { ref, onMounted } from 'vue';
import ApiWrapper from '@/api/index';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useSocketioStore } from '@/stores/socketio';

const DEFAULT_NAME = 'Untitled Board';

const { t } = useI18n();
const router = useRouter();
const socketStore = useSocketioStore();

// Reactive variables
const roomId = ref('');
const mainData = ref('');

// Create new room without ids
const handleCreateDrawBoard = async () => {
  // generate a uuid for room
  let uniq = 'id' + new Date().getTime();
  socketStore.createRoom(uniq, 'drawing_board', DEFAULT_NAME);
  roomId.value = uniq;
  router.push({
    name: 'drawing_board',
    params: { roomId: roomId.value },
  });
};

// Create new room without ids - flowchart
const handleCreateFlowChart = async () => {
  // generate a uuid for room
  let uniq = 'id' + new Date().getTime();
  socketStore.createRoom(uniq, 'flowchart', DEFAULT_NAME);
  roomId.value = uniq;
  router.push({
    name: 'flowchart',
    params: { roomId: roomId.value },
  });
};

// Join existing room
const handleJoinByLink = async () => {
  if (!roomId.value) {
    alert('Please enter a Room ID');
    return;
  }
  try {
    const roomType = await socketStore.getRoomType(roomId.value);
    console.log('Room Type:', roomType);
    
    if (roomType === 'drawing_board') {
      router.push({ name: 'drawing_board', params: { roomId: roomId.value } });
    } else if (roomType === 'flowchart') {
      router.push({ name: 'flowchart', params: { roomId: roomId.value } });
    } else {
      console.error('Invalid room ID. ');
    }
  } catch (error) {
    console.error('Error fetching room type:', error);
  }
};


// On mount, bind socket events, fetch rooms, and load page data
onMounted(async () => {
  document.title = t('websiteInfo.websiteName');

  socketStore.bindEvents();
  socketStore.fetchAllRooms();

  try {
    mainData.value = await new ApiWrapper().site.getMainPageData();
  } catch (error) {
    console.error('Error loading main page data:', error);
  }
});
</script>

<template>
  <v-layout>
    <WebHeader />
    <v-main>
      <LanguageSwitcher />
      <div class="container">
        <h1>{{ t('websiteInfo.message')}}</h1>
        <p class="subtext">{{ t('websiteInfo.collaborationInfo') }}</p>
        <p class="note">{{ t('websiteInfo.signUpInfo') }}</p>
        
        <div class="options">
          <div class="option-box" @click="handleCreateDrawBoard">
            <v-icon :color="$vuetify.theme.global.current.dark ? 'white' : 'black'" size="48">
              mdi-draw
            </v-icon>
            <p>{{t('tools.toolName1')}}</p>
          </div>
          
          <div class="option-box" @click="handleCreateFlowChart">
            <v-icon :color="$vuetify.theme.global.current.dark ? 'white' : 'black'" size="48">
              mdi-chart-timeline-variant
            </v-icon>
            <p>{{t('tools.toolName2')}}</p>
          </div>
        </div>
      
        <p>{{t('linkEntry.linkText')}}</p>
        <div class="input-container">
          <input v-model="roomId" type="text" :placeholder="t('linkEntry.placeholder')" />
          <v-btn @click="handleJoinByLink" color="primary">{{t('linkEntry.buttonText')}}</v-btn>
        </div>
      </div>
    </v-main>
  </v-layout>
</template>

<style scoped>
.container {
  text-align: center;
  padding: 20px;
}

.subtext {
  color: #666;
  margin-bottom: 10px;
}

.note {
  color: #888;
  font-size: 0.9em;
  margin-bottom: 20px;
}

.options {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.option-box {
  width: 200px;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid #ddd;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s;
}

.option-box:hover {
  transform: scale(1.05);
}

.icon {
  width: 50px;
  height: 50px;
  margin-bottom: 10px;
}

.input-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

input {
  padding: 8px;
  width: 250px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button {
  padding: 8px 12px;
  background-color: #6b5b95;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #5a4a7d;
}
</style>
