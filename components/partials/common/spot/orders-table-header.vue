<template>
  <thead class="bg-helixGray-950">
    <tr>
      <th class="text-left">
        {{ $t('trade.pair') }}
      </th>
      <th class="text-left">
        {{ $t('trade.side') }}
      </th>
      <th class="text-right">
        {{ $t('trade.price') }}
      </th>
      <th>
        <div class="flex items-center justify-end">
          <span>{{ $t('trade.amount') }}</span>
          <IconInfoTooltip
            class="ml-2"
            :tooltip="$t('trade.amount_tooltip')"
          />
        </div>
      </th>
      <th class="text-right">
        {{ $t('trade.unfilled') }}
      </th>
      <th class="text-right">
        {{ $t('trade.filled') }}
      </th>
      <th class="text-right">
        {{ $t('trade.total') }}
      </th>
      <th></th>
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
