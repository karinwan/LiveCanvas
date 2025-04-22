<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls, ControlButton } from '@vue-flow/controls'
import { VueFlow, useVueFlow, Panel, Position } from '@vue-flow/core'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { jsPDF } from 'jspdf'

import socket from '@/services/socket'
import { useSocketioStore } from '@/stores/socketio'


// Components import
import defaultNode from './components/defaultNode.vue'
import SpecialNode from './components/SpecialNode.vue'
import SpecialEdge from './components/SpecialEdge.vue'
import OnlineMember from '@/components/OnlineMember.vue'
import ExportLink from '@/components/ExportLink.vue'
import Sidebar from '@/components/Sidebar.vue'
import FlowChartHelp from '@/components/FlowChartHelp.vue'
import TemplateSelector from '@/components/TemplateSelector.vue'
import UndoRedoControl from '@/components/UndoRedoControl.vue'

import '@vue-flow/controls/dist/style.css'


const {
  onConnect,
  addEdges,
  onNodeDoubleClick,
  onEdgeDoubleClick,
  updateEdge,
  toObject,
  applyNodeChanges,
  applyEdgeChanges
} = useVueFlow()

const { t, locale } = useI18n()

const userList = ref([]);
const userCount = ref(0);
const isLoading = ref(false);
const isUpdatingInternally = ref(false);

// Route and store
const route = useRoute();
const router = useRouter();
const store = useSocketioStore();
const currentRoomId = computed(() => route.params.roomId as string);

// Initialize socket events
store.bindEvents();

// these are our nodes
const nodes = ref<Node[]>([])

// these are our edges
const edges = ref<Edge[]>([])

// watch node labels for content change
const labelWatchers = new Map()

// Window width for responsive layout
const windowWidth = ref(window.innerWidth)

function updateWindowWidth() {
  windowWidth.value = window.innerWidth
}

// Compute if we should use alternative layout based on screen width
const useAlternativeLayout = computed(() => {
  return windowWidth.value < 1200
})
const nodeTypes = {
  default: defaultNode, // now editable
  special: SpecialNode
}

// User interface state
const showOnline = ref(false)
const showExport = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)


function toggleOnline() {
  showOnline.value = !(showOnline.value)
}

function toggleExport() {
  showExport.value = !(showExport.value)
}

const showHelp = ref<any>(null);
function toggleHelp() {
  showHelp.value.openHelp()
}


// Template selector state
const showTemplates = ref(false);
function toggleTemplates() {
  showTemplates.value = !showTemplates.value
}

// Handle join room
const showDialog = ref(false);
const username = ref('');
const handleJoinRoomClick = () => {
  store.joinRoom(route.params.roomId as string, username.value);
  showDialog.value = false;
  isLoading.value = true;
};

// Handle room full
const showRoomFullError = ref(false);
const roomFullError = ref('');
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

/**
 * Handle room full error
 */
const handleRoomFullError = () => {
  showRoomFullError.value = false;
  router.push('/');
};

/**
 * Setup socket listeners for room state
 */
const setupSocketListeners = () => {
  socket.on('room_full', (data) => {
    if (data.roomId === route.params.roomId) {
      roomFullError.value = data.message || '';
      showRoomFullError.value = true;
    }
  });

  socket.on('room_name_updated', (data) => {
    if (data.roomId === route.params.roomId) {
      document.title = data.newName;
    }
  });

  socket.on('canvas_state_update', (data) => {
    if (data.roomId === route.params.roomId) {
      try {
        const flow = JSON.parse(data.canvasState)
      
        if (flow.nodes && flow.edges) {
          // Temporarily disable watch for nodes and edges
          isUpdatingInternally.value = true
          nodes.value = flow.nodes;
          edges.value = flow.edges;
          isUpdatingInternally.value = false;
          console.log('Flowchart update loaded successfully');
        } else {
          console.error('Invalid flowchart format');
        }
      } catch (err) {
        console.error('Error parsing JSON for flow update:', err)
      }
    }

    isLoading.value = false;
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

  // Add handler for joined_room to get initial user count
  socket.on('joined_room', (data) => {
    if (data.room === route.params.roomId) {
    // Update user count when joining room
      if (data.userList && data.userList.users) {
        const userNames = data.userList.users.map((u: any) => u.username);
        userList.value = userNames;
        userCount.value = data.userList.users.length;
      }
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

// Component lifecycle
onMounted(() => {
  isLoading.value = true;

  window.addEventListener('resize', updateWindowWidth)

  // Add keyboard event listener
  document.addEventListener('keydown', handleKeyDown);
  
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
  
  setupSocketListeners();
  
});

onUnmounted(() => {
  store.leaveRoom(route.params.roomId as string);
  window.removeEventListener('resize', updateWindowWidth)
  document.removeEventListener('keydown', handleKeyDown);
});

// Vue Flow life cycle
onConnect((params) => {
  addEdges([{
    ...params,
    type: 'special',
    data: {
      label: '',
      editing: false
    }
  }])
})

// Add a new node
function addNode() {
  const id = Date.now().toString();
  nodes.value.push({
    id,
    position: { x: 500, y: 250 },
    type: 'special',
    data: { label: 'New Node' }, 
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top
  });
}

// Modify label on node double click
onNodeDoubleClick((event) => {
  const node = event.node
  node.data.editing = true

  // watching the label
  if (!labelWatchers.has(node.id)) {
    const stop = watch(
      () => node.data.label,
      () => {
        updateFlow()
      }
    )
    labelWatchers.set(node.id, stop)
  }
})

// Modify label on edge double click
onEdgeDoubleClick((event) => {
  event.edge.data ??= {}
  event.edge.data.editing = true
})

/**
 * Node change handler (Dimension, Position, Remove, Add)
 */
const onNodesChange = async (changes: any) => {
  const nextChanges = []

  for (const change of changes) {
    if (change.type === 'remove') {
      // const isConfirmed = await confirm('Are you sure you want to delete this node?')
      // if (isConfirmed) {
      //   nextChanges.push(change)
      // }
      nextChanges.push(change)
    } else if (change.type === 'select') {
      continue
    } else {
      nextChanges.push(change)
    }
  }

  applyNodeChanges(nextChanges)
  nextTick(() => {
    updateFlow();
  });
}

/**
 * Edge change handler (Add, Remode)
 */
const onEdgesChange = async (changes: any) => {
  const nextChanges = []

  for (const change of changes) {
    nextChanges.push(change)
  }

  applyEdgeChanges(nextChanges)
  nextTick(() => {
    updateFlow();
  });
}

/**
 * Send the current flow state to server
 */
function updateFlow() {
  if (isLoading.value) return;

  const flow = JSON.stringify(toObject());
  const roomId = route.params.roomId

  socket.emit('canvas_state_update', {
    roomId: roomId,
    canvasState: flow,
    isUndoRedo: false
  });

  console.log('Flow update sent to server from room:', roomId);
}

// Update edge connections when dragging its handle
function handleEdgeUpdate({ edge, connection }: { edge: Edge; connection: Partial<Edge> }) {
  updateEdge(edge, connection)
}

// Import template function
function importTemplate(template) {
  console.log('Importing template:', template);
  
  // Generate unique IDs for all new nodes to avoid collisions
  const idMap = {};
  const currentTime = Date.now();
  
  // Calculate viewport center for better placement
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const centerX = viewportWidth / 2 - 400; // Adjust for better centering
  const centerY = viewportHeight / 2 - 200; // Adjust for better centering
  
  // Calculate the template bounds to center it properly
  const nodePositions = template.nodes.map(node => node.position);
  const minX = Math.min(...nodePositions.map(pos => pos.x));
  const maxX = Math.max(...nodePositions.map(pos => pos.x));
  const minY = Math.min(...nodePositions.map(pos => pos.y));
  const maxY = Math.max(...nodePositions.map(pos => pos.y));
  
  const templateWidth = maxX - minX;
  const templateHeight = maxY - minY;
  const templateCenterX = minX + templateWidth / 2;
  const templateCenterY = minY + templateHeight / 2;
  
  // Calculate offset to center the template
  const offsetX = centerX - templateCenterX;
  const offsetY = centerY - templateCenterY;
  
  // Create new nodes with unique IDs and proper positioning
  const newNodes = template.nodes.map((node, index) => {
    const newId = `${node.id}-${currentTime}-${index}`;
    idMap[node.id] = newId;
    
    // Ensure node data has the editing property for double-click editing
    const nodeData = {
      ...node.data,
      editing: false // Initially not in editing mode
    };
    
    // Reduce font size in node style for imported nodes only
    const nodeStyle = {
      ...node.style,
      fontSize: '12px' // Set smaller font size for all imported nodes
    };
    
    return {
      ...node,
      id: newId,
      position: {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY
      },
      data: nodeData,
      style: nodeStyle
    };
  });
  
  // Create new edges with updated source and target node IDs
  const newEdges = template.edges.map((edge, index) => {
    // Ensure edge data has label and editing properties
    const edgeData = {
      ...edge.data,
      label: edge.label || '', // Use edge.label if it exists, otherwise ''
      editing: false // Initially not in editing mode
    };
    
    // Reduce font size in edge labelStyle for imported edges only
    const labelStyle = {
      ...(edge.labelStyle || {}),
      fontSize: '12px' // Set smaller font size for all imported edges
    };
    
    return {
      ...edge,
      id: `${edge.id}-${currentTime}-${index}`,
      source: idMap[edge.source],
      target: idMap[edge.target],
      data: edgeData,
      labelStyle: labelStyle,
      type: 'special' // Use our special edge type for edit capability
    };
  });
  
  // Add new nodes and edges to the flow
  nodes.value = [...nodes.value, ...newNodes];
  edges.value = [...edges.value, ...newEdges];
}

const openFileDialog = () => {
  fileInput.value?.click()
}

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string
        const parsed = JSON.parse(jsonContent)

        if (parsed.nodes && parsed.edges) {
          nodes.value = parsed.nodes
          edges.value = parsed.edges
          console.log(' Flowchart loaded successfully')
        } else {
          alert('Invalid flowchart file format')
        }
      } catch (err) {
        console.error(' Invalid JSON:', err)
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)
    input.value = ''
  } catch (error) {
    console.error(' File upload error:', error)
  }
}


const exportToJson = () => {
  const data = { nodes: nodes.value, edges: edges.value }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'flowchart.json'
  link.click()
  URL.revokeObjectURL(url)
}

const exportToImage = () => {
  const element = document.querySelector('.vue-flow-basic-example') as HTMLElement
  if (!element) return
  import('html2canvas').then((html2canvas) => {
    html2canvas.default(element).then((canvas) => {
      const link = document.createElement('a')
      link.download = 'flowchart.png'
      link.href = canvas.toDataURL()
      link.click()
    })
  })
}

const exportToPdf = () => {
  const element = document.querySelector('.vue-flow-basic-example') as HTMLElement
  if (!element) return
  import('html2canvas').then((html2canvas) => {
    html2canvas.default(element).then((canvas) => {
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('landscape', 'pt', 'a4')
      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save('flowchart.pdf')
    })
  })
}

const changeLanguage = (lang: string) => {
  locale.value = lang
}

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
  if (showDialog.value || isLoading.value) return;
  
  if (event.ctrlKey && event.key === 'z') {
    event.preventDefault(); // Prevent default browser undo
    undoChange();
  } else if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'Z')) {
    event.preventDefault(); // Prevent default redo
    redoChange();
  }
};

</script>

<template>
  <div style="height: 100vh">
    <!-- Move Sidebar outside of VueFlow to keep it fixed -->
    <v-container class="sidebar-container pa-0 ma-0">
      <Sidebar
        :roomId="currentRoomId"
        @openFileDialog="openFileDialog"
        @exportToJson="exportToJson"
        @exportToImage="exportToImage"
        @exportToPdf="exportToPdf"
        @changeLanguage="changeLanguage"
        @backToHome="router.push('/')"
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
    
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      :apply-default="false"
      @nodes-change="onNodesChange"
      @edges-change="onEdgesChange"
      class="vue-flow-basic-example"
      :edges-updatable="true"
      :edges-draggable="true"
      @edge:update="handleEdgeUpdate"
      :default-zoom="1"
      :min-zoom="0.2"
      :max-zoom="4"
    >
      <!-- Remove the original Panel with Sidebar -->
      
      <!-- Use single Panel for buttons regardless of screen size -->
      <Panel position="top-center" class="buttons-panel">
        <div class="d-flex gap-2">
          <v-btn type="button" @click="addNode">
            {{ t('flowChart.addNode') }}
          </v-btn>
          <v-btn type="button" @click="toggleTemplates">
            {{ t('flowChart.importTemplates') || 'Import Templates' }}
          </v-btn>
        </div>
      </Panel>

      <Panel position="top-right">
        <div style="display: flex; align-items: center; gap: 8px;">
          <v-chip
            color="info"
            variant="elevated"
            font-weight="medium"
            class="text-body-1"
            @click="toggleOnline"
          >
            <v-icon start icon="mdi-account-multiple"></v-icon>
            {{ userCount }}
          </v-chip>
          <v-btn color="primary" class="text-body-1" @click="toggleExport">
            {{ t("drawingBoard.share") }}
          </v-btn>
        </div>
      </Panel>
      <Panel position="bottom-right">
        <div class="d-flex align-center justify-end">
          <UndoRedoControl :isLoading="isLoading" @undo="undoChange" @redo="redoChange"/>
          <v-btn icon="mdi-help" @click="toggleHelp" class="ml-4"></v-btn>
        </div>
      </Panel>

      <Background pattern-color="#aaa" :gap="8" />
      <Controls/>

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

      <OnlineMember v-model="showOnline" v-if="showOnline" :users="userList"/>
      <ExportLink v-model="showExport" v-if="showExport" :roomId="currentRoomId"/>
      <FlowChartHelp ref="showHelp" />
      <TemplateSelector v-model="showTemplates" v-if="showTemplates" @select-template="importTemplate" />
      
      <!-- Custom node and edge components -->
      <template #node-special="specialNodeProps">
        <SpecialNode v-bind="specialNodeProps" />
      </template>

      <template #edge-special="specialEdgeProps">
        <SpecialEdge v-bind="specialEdgeProps" />
      </template>
    </VueFlow>
  </div>
</template>

<style>
/* Import the necessary styles for Vue Flow to work */
@import '@vue-flow/core/dist/style.css';

/* Import the default theme, this is optional but generally recommended */
@import '@vue-flow/core/dist/theme-default.css';

/* Add sidebar container styling */
.sidebar-container {
  position: fixed !important;
  top: 20px;
  left: 20px;
  z-index: 1001;
  width: auto;
  height: auto;
  overflow: visible;
  pointer-events: none;
}

.sidebar-container > * {
  pointer-events: auto;
}

/* Ensure buttons panel stays in a single row */
.buttons-panel {
  z-index: 1000;
  pointer-events: none;
}

.buttons-panel > * {
  pointer-events: auto;
}
</style>