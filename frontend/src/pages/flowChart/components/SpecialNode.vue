<script setup lang="ts">
import { ref } from 'vue'
import { Position, Handle } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()

function enableEditing() {
  // Enable editing when the node is double-clicked
  props.data.editing = true;
}
</script>

<template>
  <!-- Bind the node's style so your background color and other style properties are applied -->
  <div class="vue-flow__node-default" :style="props.style" @dblclick="enableEditing">
    <!-- Top target handle -->
    <Handle type="target" :position="Position.Top" />
    <!-- If editing is active, show an input -->
    <input
      v-if="props.data.editing"
      class="nodrag"
      v-model="props.data.label"
      @blur="props.data.editing = false"
      @keydown.enter="props.data.editing = false"
    />
    <!-- Otherwise, display the label -->
    <div v-else>
      {{ props.data.label }}
    </div>
    <!-- Bottom source handle -->
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>
