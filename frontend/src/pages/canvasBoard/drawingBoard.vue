<template>
  <div class="drawing-layout">
    <v-container class="sidebar-container pa-0 ma-0">
      <Sidebar 
        :roomId="currentRoomId"
        @openFileDialog="openFileDialog" 
        @exportToJson="exportToJson" 
        @exportToImage="exportToImage"
        @exportToPdf="exportToPdf"
        @backToHome="handleBackToHome"
        @openHelp="toggleHelp"
      />
      <input
        type="file"
        ref="fileInput"
        accept=".json"
        style="display: none"
        @change="handleFileUpload"
      />
    </v-container>
    
    <v-dialog v-model="showDialog" persistent>
      <v-card>
        <v-card-title>{{ t('drawingBoard.welcomeTitle') }}</v-card-title>
        <v-card-text>{{ t('drawingBoard.welcomeMessage') }}</v-card-text>
        <v-card-actions>
          <v-row>
            <v-col>
              <v-text-field :label="t('drawingBoard.nameLabel')" v-model="username"></v-text-field>
            </v-col>
            <v-col class="d-flex align-center">
              <v-btn color="primary" @click="handleJoinRoomClick">{{ t('drawingBoard.joinButton') }}</v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <v-dialog v-model="showRoomFullError" max-width="500">
      <v-card>
        <v-card-title class="text-error">
          {{ t('roomStatus.roomFull') }}
        </v-card-title>
        
        <v-card-text>
          <p>{{ formattedRoomFullError }}</p>
          <p>{{ t('roomStatus.tryAnotherRoom') }}</p>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="white"
            class="text-primary"
            variant="elevated"
            @click="handleRoomFullError"
          >
            {{ t('uiElements.okButton') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <div class="main-content">
      <!-- Top toolbar with user count and share button -->
      <div class="top-controls">
        <!-- Empty left side for balance -->
        <div class="left-controls"></div>
        
        <!-- Toolbar in center -->
        <Toolbar 
          v-model:tool="currentTool" 
          v-model:color="currentColor"
          v-model:brushSize="brushSize"
          v-model:strokeStyle="strokeStyle"
          v-model:isLocked="isLocked"
          @clearBoard="confirmClearBoard"
          class="custom-toolbar" 
        />
        
        <!-- Right aligned user count and share button -->
        <div class="right-controls">
          <v-chip
            @click="toggleOnline"
            color="info"
            variant="elevated"
            font-weight="medium"
            data-testid="online-button"
            class="text-body-1 mr-2"
          >
            <v-icon start icon="mdi-account-multiple"></v-icon>
            {{ userCount }}
          </v-chip>
          
          <v-btn 
            color="primary"
            class="text-body-1"
            data-testid="export-button"
            @click="toggleExport">{{ t("drawingBoard.share") }}</v-btn>
        </div>
      </div>
      
      <div class="canvas-container">
        <div id="drawing-board-container"></div>
        
        <div v-if="isLoading" class="loading-overlay">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
          <div class="mt-4">Loading whiteboard...</div>
        </div>
      </div>
      
    </div>
    
    <!-- help button -->
    <v-btn 
      icon="mdi-help"
      style="position: fixed; bottom: 20px; right: 20px; z-index: 1000;"
      @click="toggleHelp"></v-btn>
    
    <DrawBoardHelp ref="showHelp" />
    <ZoomControl v-if="drawingTools" :zoom="zoomLevel" @zoom-change="handleZoomChange"/>
    <UndoRedoControl v-if="drawingTools"
                     :isLoading="isLoading"
                     @undo="undoChange"
                     @redo="redoChange"/>
    <OnlineMember v-model="showOnline" v-if="showOnline" :users="userList"/>
    <ExportLink v-model="showExport" v-if="showExport" :roomId="currentRoomId"/>
    
    <!-- Confirmation Dialog for Board Clearing -->
    <v-dialog v-model="showClearDialog" max-width="400">
      <v-card>
        <v-card-title class="text-warning">
          {{ t('drawingBoard.confirmClearTitle') || 'Clear Board' }}
        </v-card-title>
        
        <v-card-text>
          {{ t('drawingBoard.confirmClear') || 'Are you sure you want to clear the entire board? This action cannot be undone.' }}
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="showClearDialog = false"
          >
            {{ t('uiElements.cancelButton') || 'Cancel' }}
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            @click="clearBoard"
          >
            {{ t('uiElements.clearButton') || 'Clear' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import socket from '@/services/socket';
import { useRoute, useRouter } from 'vue-router';
import { useSocketioStore } from '@/stores/socketio';
import Sidebar from '@/components/Sidebar.vue';
import UndoRedoControl from '@/components/UndoRedoControl.vue'; // Import the new component
import { useI18n } from 'vue-i18n';
import { useTheme } from 'vuetify';
import { jsPDF } from 'jspdf';
import ZoomControl from '@/components/ZoomControl.vue';
import DrawBoardHelp from '@/components/DrawBoardHelp.vue';
import OnlineMember from '@/components/OnlineMember.vue';
import ExportLink from '@/components/ExportLink.vue';
import Toolbar from '@/components/Toolbar.vue';
import DrawingTools from '@/services/drawingTools';

const RoomId = computed(() => route.params.roomId); 
// Add i18n
const { t } = useI18n();

const router = useRouter();

const showRoomFullError = ref(false);
const roomFullError = ref('');


const userList = ref([]);
// Add user count ref
const userCount = ref(0);
const showHelp = ref<any>(null);
const showOnline = ref(false);
const showExport = ref(false);
const drawingTools = ref<DrawingTools | null>(null);
const theme = useTheme();
const currentColor = ref('#000000');
const brushSize = ref(5); // Default brush size
const currentTool = ref('pencil');
const strokeStyle = ref('solid');
const showDialog = ref(false);
const username = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
const zoomLevel = ref(1);
const isLoading = ref(false);
const isUndoRedoInProgress = ref(false);
const isLocked = ref(false);  // Default is unlocked

// Add this ref for the clear confirmation dialog
const showClearDialog = ref(false);

// Route and store
const route = useRoute();
const store = useSocketioStore();
const currentRoomId = computed(() => route.params.roomId as string);

// Initialize socket events
store.bindEvents();



const formattedRoomFullError = computed(() => {
  const errorData = store.getRoomFullErrorData;
  

  if (errorData && errorData.code === 'ROOM_AT_CAPACITY') {
    return t('roomStatus.roomAtCapacityMessage', {
      roomId: errorData.roomId,
      capacity: errorData.capacity
    });
  }
  

  return roomFullError.value || t('roomStatus.generalError');
});

function toggleHelp() {
  showHelp.value.openHelp();
}

/**
 * Toggle online users panel
 */
function toggleOnline() {
  showOnline.value = !showOnline.value;
}

/**
 * Toggle export panel
 */
function toggleExport() {
  showExport.value = !showExport.value;
}

/**
 * Handle zoom level change
 */
function handleZoomChange(newZoom: number) {
  zoomLevel.value = newZoom;
  // Apply zoom logic for Konva
  if (drawingTools.value) {
    drawingTools.value.applyZoom(newZoom);
  }
}

/**
 * Resize canvas to fit container
 */
const resizeCanvas = () => {
  if (!drawingTools.value) return;
  
  const container = document.querySelector('.canvas-container');
  if (!container) return;
  
  // Calculate available width and height
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  console.log(`Resizing canvas to: ${width}x${height}`);
  
  // Resize Konva stage
  drawingTools.value.resizeStage(width, height);
};

/**
 * Setup socket listeners for room state
 */
const setupSocketListeners = () => {

  socket.on('canvas_state_update', (data) => {
    if (data.roomId === route.params.roomId) {
      // Hide loading state after receiving canvas data
      isLoading.value = false;
      console.log('Received canvas state update, hiding loading state');
    }
  });

  socket.on('uploaded_json_content', (data) => {
    if (data.roomId === route.params.roomId) {
      isLoading.value = false;
      console.log('Received JSON content, hiding loading state');
    }
  });
  
  socket.on('cached_drawing', (data) => {
    isLoading.value = false;
    console.log('Received cached drawings, hiding loading state');
  });

  // Hide loading state in case of errors
  socket.on('error', (data) => {
    isLoading.value = false;
    console.error('Socket error:', data.message);
  });
  
  setTimeout(() => {
    if (isLoading.value) {
      isLoading.value = false;
      console.log('Loading timeout reached, hiding loading state');
    }
  }, 5000); // 5 seconds timeout for loading state
  
  // Add listeners for room user updates
  socket.on('room_users_update', (data) => {
    if (data.roomId === route.params.roomId) {
      userCount.value = data.userCount;
    }
  });

  socket.on('room_name_updated', (data) => {
    if (data.roomId === route.params.roomId) {
      document.title = data.newName;
    }
  });
  socket.on('room_full', (data) => {
    if (data.roomId === route.params.roomId) {
      roomFullError.value = data.message || '';
      showRoomFullError.value = true;
    }
  });

  
  // Add handler for joined_room to get initial user count
  socket.on('joined_room', (data) => {
    if (data.room === route.params.roomId) {
      // Update user count when joining room
      if (data.userList && data.userList.users) {
        const userNames = data.userList.users.map((u: any) => u.username);
        userList.value = userNames;
        userCount.value = data.userList.users.length;
      }
      // Update the document title with the room name
      document.title = data.name;
    }
  });
  
  // Add handler for left_room to update user count
  socket.on('left_room', (data) => {
    if (data.room === route.params.roomId) {
      // Update user count when someone leaves the room
      if (data.userList && data.userList.users) {
        const userNames = data.userList.users.map((u: any) => u.username);
        userList.value = userNames;
        userCount.value = data.userList.users.length;
      }
    }

  });
};

// Handle room full error by returning to main page
const handleRoomFullError = () => {
  showRoomFullError.value = false;
  router.push('/');
};

/**
 * Handle join room button click
 */
const handleJoinRoomClick = () => {
  if (!username.value.trim()) {
    alert(t('drawingBoard.nameRequired') || 'Please enter your name to join');
    return;
  }
  
  const roomId = route.params.roomId as string;
  
  sessionStorage.setItem('currentRoom', roomId);
  sessionStorage.setItem('currentUser', username.value);
  
  store.joinRoom(roomId, username.value);
  showDialog.value = false;
  isLoading.value = true;
};

// Component lifecycle
onMounted(() => {
  isLoading.value = true;
  
  // Check if user is already in a room
  if (sessionStorage.getItem('currentRoom') != route.params.roomId) {
    // cached room and current url room do not match, need to leave the old one and clear cache
    store.leaveRoom(sessionStorage.getItem('currentRoom') as string);
    sessionStorage.clear();
    showDialog.value = true;
    isLoading.value = false;
  } else {
    // refresh the page, keep the old name
    store.joinRoom(
      route.params.roomId as string, 
      sessionStorage.getItem('currentUser') as string
    );
  }

  // Get container dimensions
  const container = document.querySelector('.canvas-container');
  if (!container) return;
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Initialize Konva tools with the room ID
  drawingTools.value = new DrawingTools(
    'drawing-board-container', 
    width, 
    height, 
    route.params.roomId as string
  );
  
  // Set initial tool
  drawingTools.value.setTool(currentTool.value, currentColor.value, brushSize.value);
  
  // Set up window resize listener
  window.addEventListener('resize', resizeCanvas);
  
  // Add keyboard event listener
  document.addEventListener('keydown', handleKeyDown);

  setupSocketListeners();
  
  // Set up watchers for tool changes
  watch(currentTool, (newTool) => {
    // Don't change tools if locked
    if (!isLocked.value) {
      drawingTools.value?.setTool(newTool, currentColor.value, brushSize.value);
    }
  });
  
  // Set up watchers for color changes
  watch(currentColor, (newColor) => {
    drawingTools.value?.updateColor(newColor);
  });
  
  // Set up watchers for brush size changes
  watch(brushSize, (newSize) => {
    drawingTools.value?.updateBrushSize(newSize);
  });
  
  // Update room ID if it changes
  watch(currentRoomId, (newRoomId) => {
    if (drawingTools.value) {
      drawingTools.value.setRoomId(newRoomId);
      isLoading.value = true;
    }
  });
  
  // Watch for isLocked changes to trigger the lock/unlock functionality
  watch(isLocked, (newLockedState) => {
    toggleBoardLock(newLockedState);
  });
});

// Clean up on component unmount
onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
  document.removeEventListener('keydown', handleKeyDown);
  
  if (drawingTools.value) {
    drawingTools.value.dispose();
  }
  
  // Get the current room ID and username before leaving
  const currentRoom = route.params.roomId as string;
  const currentUser = sessionStorage.getItem('currentUser');
  
  // Make sure we have both values before attempting to leave the room
  if (currentRoom && currentUser) {
    console.log(`Leaving room ${currentRoom} as user ${currentUser}`);
    store.leaveRoom(currentRoom, currentUser);
  } else {
    console.warn('Cannot leave room: missing currentRoom or currentUser', { 
      currentRoom, currentUser 
    });
  }
});

/**
 * Export canvas to JSON
 */
const exportToJson = () => {
  if (!drawingTools.value || isLoading.value) return;

  const json = drawingTools.value.toJSON();

  // Create and download JSON file
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'drawing.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export canvas to Image (.png)
 */
const exportToImage = () => {
  if (!drawingTools.value || isLoading.value) return;

  const dataUrl = drawingTools.value.toDataURL('image/png');

  // Create and download PNG file
  const link = document.createElement('a');

  link.href = dataUrl;
  link.download = 'drawing.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export canvas to PDF
 */
const exportToPdf = () => {
  if (!drawingTools.value || isLoading.value) return;

  // Get image data
  const dataUrl = drawingTools.value.toDataURL('image/png');

  // Create a new PDF document
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const imgWidth = 210; // A4 width in mm
  
  // Create an image to get dimensions
  const img = new Image();
  img.src = dataUrl;
  
  // We need to handle async image loading
  img.onload = () => {
    // Calculate proportional height for PDF based on image dimensions
    const imgHeight = (img.height / img.width) * imgWidth;
    
    // Add the image to the PDF
    pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Save the PDF
    pdf.save('drawing.pdf');
  };
};
// Open file dialog for JSON upload
const openFileDialog = () => {
  if (isLoading.value) return;
  fileInput.value?.click();
};

/**
 * Handle file upload
 */
const handleFileUpload = (event: Event) => {
  if (isLoading.value) return;
  
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  
  try {
    // Show loading state
    isLoading.value = true;
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string;
        
        // Validate that this is valid JSON before proceeding
        JSON.parse(jsonContent); // This will throw if invalid
        
        // Use DrawingTools' broadcast method
        if (drawingTools.value) {
          drawingTools.value.broadcastJSON(jsonContent);
          console.log('JSON content sent for broadcasting');
        } else {
          console.error('Drawing tools not initialized');
          isLoading.value = false;
        }
      } catch (parseError) {
        console.error('Error parsing JSON file:', parseError);
        alert('Invalid JSON file. Please select a valid drawing file.');
        isLoading.value = false;
      }
    };
    
    reader.onerror = () => {
      console.error('Error reading file');
      alert('Failed to read the file. Please try again.');
      isLoading.value = false;
    };
    
    reader.readAsText(file);
    if (input) {
      input.value = ''; // Reset input
    }
  } catch (error) {
    console.error('Error handling file upload:', error);
    isLoading.value = false;
  }
};

// Update the undoChange and redoChange functions 
const undoChange = () => {
  if (isLoading.value) return;
  
  console.log('Handling undo');
  isLoading.value = true;
  
  socket.emit('client_undo', { roomId: route.params.roomId });
  
  // Safety timeout
  setTimeout(() => {
    if (isLoading.value) {
      isLoading.value = false;
    }
  }, 5000); // 5 second timeout for safety
};
const redoChange = () => {
  if (isLoading.value) return;
  
  console.log('Handling redo');
  isLoading.value = true;
  
  socket.emit('client_redo', { roomId: route.params.roomId });
  
  // Safety timeout
  setTimeout(() => {
    if (isLoading.value) {
      isLoading.value = false;
    }
  }, 5000); // 5 second timeout for safety
};

// Enhanced keyboard handler
const handleKeyDown = (event) => {
  // Ignore events when modals are open or loading is in progress
  if (showDialog.value || isLoading.value || isUndoRedoInProgress.value) return;
  
  if (event.ctrlKey && event.key === 'z') {
    event.preventDefault(); // Prevent default browser undo
    undoChange();
  } else if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'Z')) {
    event.preventDefault(); // Prevent default redo
    redoChange();
  }
};

const handleBackToHome = () => {
  // Call leaving room before navigating so that roomId has not been changed
  const currentRoom = route.params.roomId as string;
  const currentUser = sessionStorage.getItem('currentUser');
  
  if (currentRoom && currentUser) {
    console.log(`Leaving room ${currentRoom} as user ${currentUser}`);
    store.leaveRoom(currentRoom, currentUser);
  } else {
    console.warn('Cannot leave room: missing currentRoom or currentUser', { 
      currentRoom, currentUser 
    });
  }

  router.push('/');
};

// Add this function to control locking
const toggleBoardLock = (locked: boolean) => {
  isLocked.value = locked;
  
  if (drawingTools.value) {
    // When locked, set to 'select' tool but disable all interactions
    if (isLocked.value) {
      // Store previous tool to restore it later
      sessionStorage.setItem('previousTool', currentTool.value);
      currentTool.value = 'select';
      
      // Disable all interactions (important: keep the tool as 'select' but disable)
      drawingTools.value.disableAllInteractions();
    } else {
      // Restore previous tool or keep current
      const prevTool = sessionStorage.getItem('previousTool') || 'pencil';
      currentTool.value = prevTool;
      drawingTools.value.enableAllInteractions();
      drawingTools.value.setTool(currentTool.value, currentColor.value, brushSize.value);
    }
  }
};

// Function to confirm clearing the board
const confirmClearBoard = () => {
  if (isLocked.value) {
    // Don't allow clearing if board is locked
    alert(t('drawingBoard.cannotClearLocked') || 'Cannot clear the board when it is locked.');
    return;
  }
  
  showClearDialog.value = true;
};

// Function to actually clear the board
const clearBoard = () => {
  if (!drawingTools.value) return;
  
  // Close the dialog
  showClearDialog.value = false;
  
  // Show loading state
  isLoading.value = true;
  
  // Clear the canvas (this function already handles WebSocket broadcast)
  drawingTools.value.broadcastClear();
  
  // Reset loading state after a short delay
  setTimeout(() => {
    isLoading.value = false;
  }, 1000);
};

</script>

<style scoped>
/* Layout styles with Vuetify utilities */
.drawing-layout {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.top-controls {
  position: fixed;
  top: 20px;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  max-width: 1400px;
  margin: 0 auto;
  pointer-events: none;
  }

.top-controls > * {
  pointer-events: auto;
}

.left-controls {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  min-width: 100px;
}

.right-controls {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-width: 200px;
}

/* Custom toolbar positioning */
.custom-toolbar {
  flex: 0 0 auto;
}

:deep(.toolbar) {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  transform: none !important;
}

.canvas-container {
  flex-grow: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

#drawing-board-container {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.undo-redo-controls {
  position: fixed;
  bottom: 20px;
  left: 190px; /* Increased spacing from ZoomControl */
  display: flex;
  align-items: center;
  gap: 15px;
  z-index: 999;
  margin-left: 10px; /* Additional margin */
  height: 58px; /* Match ZoomControl height */
}

.zoom-controls {
  position: fixed;
  bottom: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  z-index: 999;
  height: 58px; /* Explicit height */
}

.zoom-percentage {
  font-size: 16px;
  font-weight: bold;
}

.sidebar-container {
  position: fixed !important;
  top: 20px;
  left: 20px;
  z-index: 1000;
  width: auto;
  height: auto;
  overflow: visible;
  pointer-events: none;
}

.sidebar-container :deep(> *) {
  pointer-events: auto;
}
</style>