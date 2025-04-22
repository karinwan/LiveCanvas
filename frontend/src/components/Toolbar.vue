<template>
  <div class="position-relative">
    <!-- Main Toolbar -->
    <v-card class="toolbar"
            elevation="4"
            rounded="lg">
      <div class="d-flex align-center px-2">
        <!-- Lock Button -->
        <v-btn
          :color="isLocked ? 'error' : undefined"
          icon
          variant="text"
          @click="toggleLock"
        >
          <v-icon>{{ isLocked ? 'mdi-lock' : 'mdi-lock-open' }}</v-icon>
          <v-tooltip activator="parent" location="bottom" theme="dark">{{ isLocked ? t('toolBar.unlockBoard') : t('toolBar.lockBoard') }}</v-tooltip>
        </v-btn>
        
        <!-- Clear Board Button (new) -->
        <v-btn
          color="error"
          icon
          variant="text"
          @click="handleClearBoard"
          :disabled="isLocked"
        >
          <v-icon>mdi-delete-sweep</v-icon>
          <v-tooltip activator="parent" location="bottom" theme="dark"> {{ t('toolBar.clearBoard') }} </v-tooltip>
        </v-btn>
        
        <!-- Pencil Tool Button -->
        <v-btn
          :color="currentTool === 'pencil' && !isLocked ? 'primary' : undefined"
          icon
          variant="text"
          @click.stop="activatePencil"
          :disabled="isLocked"
          class="pencil-tool-btn"
        >
          <v-icon>mdi-pencil</v-icon>
          <v-tooltip activator="parent" location="bottom" theme="dark">{{ t('toolBar.pencil') }}</v-tooltip>
        </v-btn>
        
        <!-- Arrow Tool Button -->
        <v-btn
          :color="currentTool === 'arrow' && !isLocked ? 'primary' : undefined"
          icon
          variant="text"
          @click="activateArrow"
          :disabled="isLocked"
        >
          <v-icon>mdi-arrow-right</v-icon>
          <v-tooltip activator="parent" location="bottom" theme="dark">{{ t('toolBar.arrow') }}</v-tooltip>
        </v-btn>
        
        <!-- Rectangle Tool Button -->
        <v-btn
          :color="currentTool === 'rectangle' && !isLocked ? 'primary' : undefined"
          icon
          variant="text"
          @click="activateRectangle"
          :disabled="isLocked"
        >
          <v-icon>mdi-rectangle-outline </v-icon>
          <v-tooltip activator="parent" location="bottom" theme="dark">{{ t('toolBar.rectangle') }}</v-tooltip>
        </v-btn>
        
        <!-- Pan Tool Button -->
        <v-btn
          :color="currentTool === 'pan' && !isLocked ? 'primary' : undefined"
          icon
          variant="text"
          @click="activatePan"
          :disabled="isLocked"
        >
          <v-icon>mdi-hand-back-right</v-icon>
          <v-tooltip activator="parent" location="bottom" theme="dark">{{ t('toolBar.panCanvas') }}</v-tooltip>
        </v-btn>

        <!-- Eraser Tool Button -->
        <v-btn
          :color="currentTool === 'eraser' && !isLocked ? 'primary' : undefined"
          icon
          variant="text"
          @click="activateEraser"
          :disabled="isLocked"
        >
          <v-icon>mdi-eraser</v-icon>
          <v-tooltip activator="parent" location="bottom" theme="dark">{{ t('toolBar.eraser') }}</v-tooltip>
        </v-btn>
        
        <!-- Text Tool Button -->
        <v-btn
          :color="currentTool === 'text' && !isLocked ? 'primary' : undefined"
          icon
          variant="text"
          @click="activateText"
          :disabled="isLocked"
        >
          <v-icon>mdi-format-text</v-icon>
          <v-tooltip activator="parent" location="bottom" theme="dark">{{ t('toolBar.text') }}</v-tooltip>
        </v-btn>
        
        <!-- Selection Tool Button -->
        <v-btn
          :color="currentTool === 'select' && !isLocked ? 'primary' : undefined"
          icon
          variant="text"
          @click="activateSelect"
          :disabled="isLocked"
        >
          <v-icon>mdi-cursor-default-click</v-icon>
          <v-tooltip activator="parent" location="bottom" theme="dark">{{ t('toolBar.select') }}</v-tooltip>
        </v-btn>
      </div>
    </v-card>
    
    <!-- Color Panel (Overlay) -->
    <v-card 
      v-if="showColorPanel" 
      class="color-panel" 
      elevation="4"
      width="350"
    >
      <!-- Title -->
      <v-card-title class="py-2 px-4 mt-4">Stroke</v-card-title>
      
      <!-- Color Picker -->
      <v-card-text class="pa-4">
        <div class="color-picker-container">
          <v-color-picker
            v-model="pickerColor"
            hide-inputs
            mode="hexa"
            canvas-height="300"
            width="300"
            @update:model-value="selectColor($event)"
            class="mb-4"
          ></v-color-picker>
        </div>
        
        <!-- Stroke Width -->
        <v-card-title class="py-2 px-4 mt-4">Stroke width</v-card-title>
        <div class="d-flex justify-space-between pa-4">
          <v-btn 
            :color="brushSize === 2 ? 'primary' : undefined"
            variant="outlined"
            @click="selectBrushSize(2)"
            class="width-button"
          >
            <div class="stroke-preview thin"></div>
          </v-btn>
          <v-btn 
            :color="brushSize === 5 ? 'primary' : undefined"
            variant="outlined"
            @click="selectBrushSize(5)"
            class="width-button"
          >
            <div class="stroke-preview medium"></div>
          </v-btn>
          <v-btn 
            :color="brushSize === 10 ? 'primary' : undefined"
            variant="outlined"
            @click="selectBrushSize(10)"
            class="width-button"
          >
            <div class="stroke-preview thick"></div>
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onBeforeUnmount, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface ToolbarProps {
  initialTool?: string;
  initialColor?: string;
  initialBrushSize?: number;
  isLocked?: boolean; // Add isLocked prop
}

const props = withDefaults(defineProps<ToolbarProps>(), {
  initialTool: 'pencil',
  initialColor: '#000000',
  initialBrushSize: 5,
  isLocked: false
});

const emit = defineEmits<{
  (e: 'update:tool', tool: string): void;
  (e: 'update:color', color: string): void;
  (e: 'update:brushSize', size: number): void;
  (e: 'update:strokeStyle', style: string): void;
  (e: 'update:isLocked', isLocked: boolean): void; // Add emit for lock status
  (e: 'clearBoard'): void; // Add new emit for clearing board
}>();

// Tool state
const currentTool = ref(props.initialTool);

// Color state
const currentColor = ref(props.initialColor);
const pickerColor = ref(props.initialColor);
const showColorPanel = ref(false);

// Brush size
const brushSize = ref(props.initialBrushSize);

// Stroke style
const strokeStyle = ref('solid');

// Lock state
const isLocked = ref(props.isLocked);

// Toggle lock state
const toggleLock = () => {
  isLocked.value = !isLocked.value;
  emit('update:isLocked', isLocked.value);
};

// Activate pencil tool
const activatePencil = () => {
  if (isLocked.value) return; // Don't activate if locked
  
  // Always show panel when activating pencil
  showColorPanel.value = true;
  selectTool('pencil');
};

// Activate eraser tool
const activateEraser = () => {
  if (isLocked.value) return; // Don't activate if locked
  
  showColorPanel.value = false; // Close color panel when eraser is selected
  selectTool('eraser');
};

// Activate text tool
const activateText = () => {
  if (isLocked.value) return; // Don't activate if locked
  
  showColorPanel.value = true; // Show color panel for text color selection
  selectTool('text');
};

// Activate selection tool
const activateSelect = () => {
  if (isLocked.value) return; // Don't activate if locked
  
  showColorPanel.value = false; // Close color panel when selection is active
  selectTool('select');
};

const activateRectangle = () => {
  if (isLocked.value) return; // Don't activate if locked
  
  showColorPanel.value = false; // Close color panel when rectangle is selected
  selectTool('rectangle');
};
const activateArrow = () => {
  if (isLocked.value) return; // Don't activate if locked
  
  showColorPanel.value = false; // Close color panel when arrow is selected
  selectTool('arrow');
};
const activatePan = () => {
  if (isLocked.value) return; // Don't activate if locked
  
  showColorPanel.value = false; // Close color panel when pan is selected
  selectTool('pan');
};

// Handle clearing the board
const handleClearBoard = () => {
  if (isLocked.value) return; // Don't clear if locked
  emit('clearBoard');
};

// Close color panel when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const panel = document.querySelector('.color-panel');
  const pencilBtn = document.querySelector('.pencil-tool-btn');
  
  // If clicking on pencil button, don't close the panel
  if (pencilBtn && (pencilBtn === target || pencilBtn.contains(target))) {
    return;
  }
  
  // Only close if the click is outside the panel
  if (showColorPanel.value && panel && !panel.contains(target)) {
    showColorPanel.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Handle tool selection
const selectTool = (tool: string) => {
  currentTool.value = tool;
  emit('update:tool', tool);
};

// Handle color selection
const selectColor = (color: string) => {
  currentColor.value = color;
  pickerColor.value = color;
  emit('update:color', color);
};

// Handle brush size selection
const selectBrushSize = (size: number) => {
  brushSize.value = size;
  emit('update:brushSize', size);
};

// Handle stroke style selection
const selectStrokeStyle = (style: string) => {
  strokeStyle.value = style;
  emit('update:strokeStyle', style);
};

// Watch for prop changes
watch(() => props.initialTool, (newTool) => {
  if (newTool !== currentTool.value) {
    currentTool.value = newTool;
  }
});

watch(() => props.initialColor, (newColor) => {
  if (newColor !== currentColor.value) {
    currentColor.value = newColor;
    pickerColor.value = newColor;
  }
});

watch(() => props.initialBrushSize, (newSize) => {
  if (newSize !== brushSize.value) {
    brushSize.value = newSize;
  }
});

// Watch for prop changes including isLocked
watch(() => props.isLocked, (newLocked) => {
  if (newLocked !== isLocked.value) {
    isLocked.value = newLocked;
  }
});
</script>

<style scoped>
.position-relative {
  position: relative;
}

.toolbar {
  display: inline-flex;
}

.color-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 100;
  overflow: visible;
}

/* Stroke preview styles */
.stroke-preview {
  width: 30px;
  height: 2px;
  background-color: currentColor;
}

.stroke-preview.thin {
  height: 1px;
}

.stroke-preview.medium {
  height: 2px;
}

.stroke-preview.thick {
  height: 4px;
}

/* Stroke style previews */
.stroke-style-preview {
  width: 30px;
  height: 2px;
}

.stroke-style-preview.solid {
  border-top: 2px solid currentColor;
}

.stroke-style-preview.dashed {
  border-top: 2px dashed currentColor;
}

.stroke-style-preview.dotted {
  border-top: 2px dotted currentColor;
}

/* Color display */
.selected-color-display {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #ddd;
}

/* Rainbow and transparency sliders */
.color-slider {
  height: 16px;
  width: 100%;
  border-radius: 8px;
}

.rainbow-slider {
  background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
}

.transparency-slider {
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
                   linear-gradient(-45deg, #ccc 25%, transparent 25%),
                   linear-gradient(45deg, transparent 75%, #ccc 75%),
                   linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 10px 10px;
  background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
}

.width-button, .style-button {
  min-width: 80px;
  height: 48px;
}

/* Fix for color picker display */
:deep(.v-color-picker) {
  width: 100%;
  overflow: visible;
}

:deep(.v-color-picker__canvas) {
  overflow: visible;
}
</style>