<template>
  <thead class="bg-helixGray-950">
    <tr>
      <th class="text-left">
        <div class="flex items-center">
          {{ $t('trade.time') }}
          <IconInfoTooltip
            class="ml-2"
            :tooltip="$t('trade.timestamp_tooltip')"
          />
        </div>
      </th>
      <th class="text-left">
        {{ $t('trade.pair') }}
      </th>
      <th class="text-left">
        {{ $t('trade.type') }}
      </th>
      <th class="text-left">
        <span>{{ $t('trade.side') }}</span>
      </th>
      <th class="text-right">
        {{ $t('trade.price') }}
      </th>
      <th>
        <div class="flex items-center justify-end">
          <span>{{ $t('trade.amount') }}</span>
          <IconInfoTooltip class="ml-2" :tooltip="$t('trade.amount_tooltip')" />
        </div>
      </th>
      <th>
        <div class="flex items-center justify-end">
          {{ $t('trade.fee') }}
          <IconInfoTooltip class="ml-2" :tooltip="$t('trade.fees_tooltip')" />
        </div>
      </th>
      <th>
        <div class="flex items-center justify-end">
          <span>{{ $t('trade.total') }}</span>
          <IconInfoTooltip class="ml-2" :tooltip="$t('trade.total_tooltip')" />
        </div>
      </th>
    </tr>
  </thead>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  props: {
    //
  }
})
</script>
