<script setup>
import { ref, defineEmits } from 'vue';
import { ColorPicker } from 'vue-color-kit';
import 'vue-color-kit/dist/vue-color-kit.css';

const emit = defineEmits(['colorChange', 'widthChange', 'styleChange']);

const selectedColor = ref('#000000');
const strokeWidth = ref(2);
const strokeStyle = ref('solid');

const strokeWidths = [1, 2, 3, 5, 10];
const strokeStyles = ['solid', 'dashed', 'dotted'];

const selectColor = (color) => {
  selectedColor.value = color.hex;
  emit('colorChange', selectedColor.value);
};

const selectStrokeWidth = (width) => {
  strokeWidth.value = width;
  emit('widthChange', width);
};

const selectStrokeStyle = (style) => {
  strokeStyle.value = style;
  emit('styleChange', style);
};
</script>

<template>
  <div class="color-picker">
    <p class="section-title">Stroke</p>
    <ColorPicker v-model="selectedColor" theme="light" @change="selectColor" />

    <p class="section-title">Stroke width</p>
    <div class="stroke-options">
      <button
        v-for="width in strokeWidths"
        :key="width"
        @click="selectStrokeWidth(width)"
        :class="{ selected: strokeWidth === width }"
      >
        {{ width }}
      </button>
    </div>

    <p class="section-title">Stroke style</p>
    <div class="stroke-options">
      <button
        v-for="style in strokeStyles"
        :key="style"
        @click="selectStrokeStyle(style)"
        :class="{ selected: strokeStyle === style }"
        \\
      >
        {{ style === "solid" ? "—" : style === "dashed" ? "--" : "....." }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.color-picker {
  position: absolute;
  top: 150px;
  left: 20px;
  background: white;
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  width: 230px;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  margin: 10px 0 5px;
}

.stroke-options {
  display: flex;
  gap: 5px;
}

button {
  width: 40px;
  height: 30px;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  transition: transform 0.2s ease-in-out;
}

button.selected {
  border: 2px solid black;
}

button:hover {
  transform: scale(1.1);
}
</style>
