<template>
  <v-text-field
    v-model="roomName"
    @blur="saveRoomName"
    @keyup.enter="saveRoomName"
    class="room-name-input"
    @focus="isFocused = true"
    :variant="isFocused ? 'outlined' : 'solo'"
    single-line
    density="compact"
    hide-details
    flat
    background-color="transparent"
  />
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import socket from '@/services/socket';

const DEFAULT_NAME = 'Untitled Board';

const props = defineProps({
  initialRoomName: {
    type: String,
    default: () => 'Untitled Board',
  },
  roomId: {
    type: String,
    required: true,
  },
});

const roomName = ref(props.initialRoomName || DEFAULT_NAME);
const isFocused = ref(false);

console.log('RoomName.vue mounted, roomId:', props.roomId);

const saveRoomName = async () => {
  isFocused.value = false;

  if (!roomName.value.trim()) {
    alert('Room name cannot be empty!');
    return;
  }

  if (!props.roomId) {
    console.error('Error: Room ID is undefined, cannot update room name.');
    return;
  }

  console.log('Updating room name: ${roomName.value}, Room ID: ${props.roomId}');
  socket.emit('update_room_name', { roomId: props.roomId, newName: roomName.value });

};

onMounted(async () => {
  if (!props.roomId) {
    console.error('Error: roomId is undefined, cannot join room.');
    return;
  }

  socket.emit('get_room_name', { roomId: props.roomId });

  socket.on('room_name_updated', (data) => {
    if (data.roomId === props.roomId) {
      roomName.value = data.newName;
      sessionStorage.setItem('currentRoomName', roomName.value);
      console.log('Room name updated via WebSocket:', roomName.value);
    }
  });

  socket.on('disconnect', () => {
    console.warn('WebSocket disconnected, retrying...');
    setTimeout(() => socket.connect(), 3000);
  });
});

defineExpose({
  roomName,
  saveRoomName,
});
</script>

<style lang="css" scoped>

.v-text-field >>> input {
    font-size: 1.2em;
    font-weight: bold;
}

</style>