<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@vue-flow/core'
import { computed, ref, onMounted } from 'vue'

const props = defineProps<EdgeProps>()
const inputRef = ref(null)

const path = computed(() => getBezierPath(props))

// Focus the input field when editing starts
onMounted(() => {
  if (props.data?.editing && inputRef.value) {
    inputRef.value.focus()
  }
})
</script>

<script lang="ts">
export default {
  inheritAttrs: false
}
</script>

<template>
  <!-- You can use the `BaseEdge` component to create your own custom edge more easily -->
  <BaseEdge :path="path[0]" />

  <!-- Use the `EdgeLabelRenderer` to escape the SVG world of edges and render your own custom label in a `<div>` ctx -->
  <EdgeLabelRenderer>
    <div
      :style="{
        pointerEvents: 'all',
        position: 'absolute',
        transform: `translate(-100%, -50%) translate(${path[1] - 5}px, ${path[2]}px)`
      }"
      class="nodrag nopan"
    >
      <div v-if="props.data.editing" class="edge-edit-container">
        <input
            ref="inputRef"
            v-model="props.data.label"
            @blur="props.data.editing = false"
            @keydown.enter="props.data.editing = false"
            placeholder="Enter edge label"
            class="edge-input"
        />
        <div class="edit-indicator">Editing label</div>
      </div>
      <span v-else class="edge-label-text">
        {{ props.data.label }}
      </span>
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped>
.edge-label-text {
  font-size: 12px;
  padding: 2px 4px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 2px;
}

.edge-edit-container {
  position: relative;
  min-width: 140px;
}

.edge-input {
  width: 140px;
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #4361ee;
  border-radius: 3px;
  background-color: #fff;
  box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.3);
  outline: none;
}

.edit-indicator {
  position: absolute;
  top: -20px;
  left: 0;
  font-size: 10px;
  color: #4361ee;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 2px 4px;
  border-radius: 2px;
  white-space: nowrap;
}
</style>
