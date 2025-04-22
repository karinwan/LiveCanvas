import { useSocketioStore } from '@/stores/socketio';
import router from '@/router';

/**
 * Join a board-based room at "/board/:roomId"
 */
export const joinBoardRoom = (roomId: string, username?: string): Promise<void> => {
  const socketStore = useSocketioStore();
  
  return new Promise((resolve, reject) => {
    if (!roomId) {
      reject(new Error('Room ID is required'));
      return;
    }
    
    // Clear any existing room full errors
    socketStore.clearRoomFullError();
    
    try {
      const actualUsername = username || `user_${Date.now()}`;
      socketStore.joinRoom(roomId, actualUsername);
      
      // Wait a moment to check if we get a room full error
      setTimeout(() => {
        if (socketStore.getRoomFullError) {
          reject(new Error(socketStore.getRoomFullError));
          return;
        }
        
        // If no error, navigate to drawing board
        router.push({
          name: 'drawing_board',
          params: { roomId }
        });
        resolve();
      }, 500);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Create a new unnamed board-based room,
 * then automatically join it and navigate to "/board/:roomId"
 */
export const createBoardRoomNew = (username?: string): Promise<string> => {
  const socketStore = useSocketioStore();
  
  return new Promise((resolve, reject) => {
    socketStore.createRoomNew('drawing_board'); // still creates a random room ID
    
    const timeoutId = setTimeout(() => {
      reject(new Error('Room creation timed out'));
    }, 5000);
    
    const checkInterval = setInterval(() => {
      if (socketStore.lastCreatedRoom) {
        clearTimeout(timeoutId);
        clearInterval(checkInterval);
        
        const roomId = socketStore.lastCreatedRoom;
        const actualUsername = username || `user_${Date.now()}`;
        
        socketStore.joinRoom(roomId, actualUsername);
        
        // Short delay to check for room full errors (should not happen for new rooms)
        setTimeout(() => {
          if (socketStore.getRoomFullError) {
            reject(new Error(socketStore.getRoomFullError));
            return;
          }
          
          router.push({
            name: 'drawing_board',
            params: { roomId }
          });
          resolve(roomId);
        }, 500);
      }
    }, 100);
  });
};

/**
 * Leave a room
 * @param roomId The ID of the room to leave
 */
export const leaveRoom = (roomId: string): Promise<void> => {
  const socketStore = useSocketioStore();
  
  return new Promise((resolve) => {
    socketStore.leaveRoom(roomId);
    resolve();
  });
};

/**
 * Leave the current room if any
 */
export const leaveCurrentRoom = (): Promise<void> => {
  const socketStore = useSocketioStore();
  const currentRoom = socketStore.getCurrentRoom;
  
  return new Promise((resolve) => {
    if (currentRoom) {
      socketStore.leaveRoom(currentRoom);
    }
    resolve();
  });
};

/**
 * Get available rooms
 * @returns Promise that resolves with the list of available rooms
 */
export const getAvailableRooms = (): Promise<string[]> => {
  const socketStore = useSocketioStore();
  
  return new Promise((resolve) => {
    socketStore.fetchAllRooms();
    resolve(socketStore.roomList);
  });
};

/**
 * Get current room user count
 * @returns The number of users in the current room
 */
export const getRoomUserCount = (): number => {
  const socketStore = useSocketioStore();
  return socketStore.getRoomUserCount;
};

/**
 * Check if a room is at full capacity
 * @param roomId The ID of the room to check
 * @returns Promise that resolves with true if room is full, false otherwise
 */
export const isRoomFull = (roomId: string): Promise<boolean> => {
  const socketStore = useSocketioStore();
  
  return new Promise((resolve) => {
    // This is a placeholder since we need the backend to implement this
    // We'll use the roomFullError as an indicator
    socketStore.clearRoomFullError();
    
    // Try to join temporarily to check capacity
    const tempUsername = `temp_check_${Date.now()}`;
    socketStore.joinRoom(roomId, tempUsername);
    
    // Wait for potential room full error
    setTimeout(() => {
      const isFull = socketStore.getRoomFullError !== null;
      resolve(isFull);
      
      // If we joined successfully, leave the room
      if (!isFull) {
        socketStore.leaveRoom(roomId);
      }
    }, 500);
  });
};