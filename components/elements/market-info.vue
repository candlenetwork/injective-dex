<template>
  <div class="w-auto px-0 lg:px-3">
    <span
      class="text-gray-500 mb-1 w-full lg:text-right text-xs flex items-center lg:justify-between whitespace-nowrap"
    >
      {{ title }}
      <IconInfoTooltip v-if="tooltip" class="ml-2" :tooltip="tooltip" />
    </span>
    <div>
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  props: {
    title: {
      required: true,
      type: String
    },

    tooltip: {
      required: false,
      default: '',
      type: String
    }
  }
})
</script>
