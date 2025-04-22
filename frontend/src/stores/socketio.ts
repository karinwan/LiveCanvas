import { defineStore } from 'pinia';
import socket from '@/services/socket';

export const useSocketioStore = defineStore('socketio', {
  state: () => ({
    connected: false,
    roomList: [] as string[],
    messages: [] as string[],
    drawings: [],
    lastCreatedRoom: null,
    currentRoom: null as string | null,
    currentRooms: [],
    uploadedJsonContent: null,
    roomUserCount: 0,
    roomFullError: null,
    roomFullErrorData: null, 
    roomInfo: null,
  }),

  getters: {
    getCurrentRoom: (state) => state.currentRoom,
    getCurrentRooms: (state) => state.currentRooms,
    getUploadedJsonContent: (state) => state.uploadedJsonContent,
    getRoomUserCount: (state) => state.roomUserCount,
    getRoomFullError: (state) => state.roomFullError,
    getRoomFullErrorData: (state) => state.roomFullErrorData, 
    getRoomInfo: (state) => state.roomInfo,
  },

  actions: {
    bindEvents() {
      // Below are the event listeners
      socket.on('connect', () => {
        this.connected = true;
      });

      socket.on('disconnect', () => {
        this.connected = false;
      });

      socket.on('rooms_list', (data) => {
        this.roomList = data.rooms;
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      socket.on('room_full', (data) => {

        this.roomFullErrorData = data;
        

        if (data.code === 'ROOM_AT_CAPACITY') {
          this.roomFullError = 'ROOM_AT_CAPACITY';
        } else {
          this.roomFullError = data.message || 'Room is full';
        }
        
        console.error('Room full error:', data);
      });
      
      // Add handler for room info response
      socket.on('room_info', (data) => {
        this.roomInfo = data;
        
        // If room is full, set the roomFullError
        if (data.isFull) {
          this.roomFullErrorData = {
            code: 'ROOM_AT_CAPACITY',
            roomId: data.roomId,
            capacity: data.capacity,
            current: data.userCount
          };
          this.roomFullError = 'ROOM_AT_CAPACITY';
        }
      });
      
      socket.on('message', (data) => {
        this.messages = data;
      });
      
      socket.on('joined_room', (data) => {
        this.messages.push(JSON.stringify(data));
        // Update user count when received
        if (data.userCount !== undefined) {
          this.roomUserCount = data.userCount;
        }
        document.title = data.name
      });
      
      socket.on('left_room', (data) => {
        this.messages.push(JSON.stringify(data));
        // Update user count when received
        if (data.userCount !== undefined) {
          this.roomUserCount = data.userCount;
        }
      });
      
      socket.on('cached_drawing', (data) => {
        this.drawings = data;
        console.log('Update drawings by cashed_drawing');

      });

      socket.on('server_canvasClear', (data) => {
        this.drawings = [];
        console.log('Canvas cleared for room:', data.roomId);
      });

      socket.on('room_created', (data) => {
        console.log('Room created:', data);
        this.lastCreatedRoom = data.room;
        if (!this.roomList.includes(data.room)) {
          this.roomList.push(data.room);
        }
      });

      socket.on('server_drawing', (data) => {
        if (data.roomId === this.currentRoom) {
          console.log(
            'Valid drawing data received for room:',
            this.currentRoom
          );
        } else {
          console.warn(
            'Received drawing data for different room:',
            data.roomId
          );
        }
      });

      // Add handler for uploaded JSON content
      socket.on('uploaded_json_content', (data) => {
        this.uploadedJsonContent = data.jsonContent;
        console.log('Received uploaded JSON content for room:', data.roomId);
      });

      // Add handler for room user count updates
      socket.on('room_users_update', (data) => {
        if (data.roomId === this.currentRoom) {
          this.roomUserCount = data.userCount;
          console.log(`Room ${data.roomId} user count updated: ${data.userCount}`);
        }
      });
    },
    
    // Check if a room is available before joining
    checkRoomAvailability(roomId: string) {
      // Clear any existing error
      this.clearRoomFullError();
      
      // Request room info
      socket.emit('get_room_info', { room: roomId });
    },
    
    // Clear room full error
    clearRoomFullError() {
      this.roomFullError = null;
      this.roomFullErrorData = null;
    },
    
    connect() {
      socket.connect();
    },
    
    disconnect() {
      socket.disconnect();
    },
    
    fetchAllRooms() {
      socket.emit('get_rooms');
    },
    
    createRoom(roomName: string, roomType: string, name: string) {
      socket.emit('create_room', { room: roomName, type: roomType, name: name });
    },

    createRoomNew(roomType: string) {
      this.lastCreatedRoom = null;
      socket.emit('create_room', { room: null, type: roomType });
    },
    
    joinRoom(roomName: string, usrName: string) {
      // If there's a room full error, clear it first
      if (this.roomFullError) {
        this.clearRoomFullError();
      }
      
      // Set current room and join
      sessionStorage.setItem('currentRoom', roomName);
      sessionStorage.setItem('currentUser', usrName);
      socket.emit('join_room', { room: roomName, username: usrName });
    },
    
    leaveRoom(roomName: string, username: string) {
      socket.emit('leave_room', { room: roomName, username: username });

      // Clear current room if we're leaving the current room
      if (this.currentRoom === roomName) {
        this.currentRoom = null;
        sessionStorage.removeItem('currentRoom');
        sessionStorage.removeItem('currentUser');
      }
    },
    
    sendMessage(roomName: string, message: string) {
      socket.emit('send_message', { room: roomName, message: message });
    },
    
    uploadJsonContent(roomId: string, jsonContent: any) {
      socket.emit('upload_json_content', { room: roomId, jsonContent });
    },

    getRoomType(roomId: string): Promise<string | null> {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout: No response from server'));
        }, 5000); // Timeout after 5 seconds
    
        const handler = (data: { type: string | null }) => {
          clearTimeout(timeout);
          socket.off('room_type', handler); // Clean up the event listener
          resolve(data.type);
        };
    
        socket.once('room_type', handler);
        socket.emit('get_room_type', { roomId });
      });
    }
  },
});

