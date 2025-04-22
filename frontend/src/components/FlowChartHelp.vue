<template>
  <v-dialog class="help" v-model="showHelp" max-width="600px">
    <v-card>
      <v-card-title class="text-h5">{{ t("flowChartHelp.manualTitle") }}</v-card-title>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-list-item>
                <v-list-item-title class="text-subtitle-1 font-weight-bold">
                  {{ t("flowChartHelp.drawingTitle") }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ t("flowChartHelp.drawingInstruction") }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item>
                <v-list-item-title class="text-subtitle-1 font-weight-bold">
                  {{ t("flowChartHelp.movingTitle") }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ t("flowChartHelp.movingInstruction") }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-divider></v-divider>
              <v-list-item>
                <v-list-item-title class="text-subtitle-1 font-weight-bold">
                  {{ t("flowChartHelp.zoomingTitle") }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ t("flowChartHelp.zoomingInstruction") }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="closeHelp">{{ t("drawBoardHelp.close") }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
  
<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
  
// Destructure the t() function for translation lookup
const { t } = useI18n();
  
const showHelp = ref(false);
  
const openHelp = () => {
  showHelp.value = true;
};
  
const closeHelp = () => {
  showHelp.value = false;
};
  
defineExpose({ openHelp });
</script>


<style scoped>
  .help {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    z-index: 999;
  }
  </style>