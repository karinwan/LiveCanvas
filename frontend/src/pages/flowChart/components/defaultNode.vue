<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()

function enableEditing() {
  props.data.editing = true
}
</script>

<template>
  <div :style="props.style" @dblclick="enableEditing">
    <Handle type="target" :position="Position.Top" />
    <input
      v-if="props.data.editing"
      class="nodrag"
      v-model="props.data.label"
      @blur="props.data.editing = false"
      @keydown.enter="props.data.editing = false"
    />
    <div v-else>{{ props.data.label }}</div>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>
