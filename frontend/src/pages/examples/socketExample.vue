<template>
  <v-card>
    <v-card-title>INFO</v-card-title>
    <v-card-text>
      <v-row>
        <span>{{ connected ? "Connected" : "disconnected" }}</span>
      </v-row>
      <v-row>
        <span> Available rooms: {{ roomList }}</span>
      </v-row>
      <v-row>
        <v-text-field
          label="give a room name"
          v-model="createRoomName"
          class="pa-3"
        ></v-text-field>
        <v-btn @click="createRoom(createRoomName)"
               class="ma-3"
        >Create a new room</v-btn
        >
      </v-row>
      <v-row>
        <v-text-field
          label="room to join"
          v-model="joinRoomName"
          class="pa-3"
        ></v-text-field>
        <v-text-field
          label="your name"
          v-model="joinUsrName"
          class="pa-3"
        ></v-text-field>
        <v-btn @click="handleJoinRoom(joinRoomName, joinUsrName)"
               class="ma-3"
        >Join the room</v-btn
        >
      </v-row>
      <v-row>
        <v-text-field
          label="room to exit"
          v-model="leaveRoomName"
          class="pa-3"
        ></v-text-field>
        <v-btn class="ma-3"
               @click="leaveRoom(leaveRoomName)"
        >Leave the room</v-btn
        >
      </v-row>
      <v-row>
        <v-textarea label="Label" v-model="messages"></v-textarea>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-btn @click="connect">Connect to WS server</v-btn>
      <v-btn @click="disconnect">Disconnect to WS server</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapActions, mapState } from 'pinia';
import { useSocketioStore } from '@/stores/socketio';

export default defineComponent({
  data() {
    return {
      createRoomName: '',
      joinRoomName: '',
      joinUsrName: '',
      leaveRoomName: '',
    };
  },
  computed: {
    ...mapState(useSocketioStore, ['connected', 'roomList', 'messages']),
  },
  methods: {
    ...mapActions(useSocketioStore, [
      'connect',
      'disconnect',
      'fetchAllRooms',
      'createRoom',
      'bindEvents',
      'joinRoom',
      'leaveRoom',
    ]),
    handleJoinRoom(joinRoomName: string, joinUsrName: string) {
      this.joinRoom(joinRoomName, joinUsrName);
      //   this.$router.push({
      //     name: "drawing",
      //     params: { roomId: this.joinRoomName },
      //   });
    },
  },
  created() {
    this.bindEvents();
  },
  mounted() {
    this.fetchAllRooms();
  },
  //   unmounted() {
  //     this.disconnect();
  //   },
});
</script>
