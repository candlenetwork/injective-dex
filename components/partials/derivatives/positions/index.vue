<template>
  <div v-if="market" class="h-full">
    <!-- mobile table -->
    <TableBody
      :show-empty="sortedPositions.length === 0"
      class="sm:hidden max-h-lg overflow-y-auto"
    >
      <mobile-position
        v-for="(position, index) in sortedPositions"
        :key="`mobile-positions-${index}-${position.marketId}`"
        class="col-span-1"
        :position="position"
      />

      <EmptyList
        slot="empty"
        :message="$t('trade.emptyPositions')"
        class="min-h-orders"
      />
    </TableBody>

    <TableWrapper class="hidden sm:block">
      <table v-if="sortedPositions.length > 0" class="table">
        <PositionTableHeader />
        <tbody>
          <tr
            is="Position"
            v-for="(position, index) in sortedPositions"
            :key="`positions-${index}-${position.marketId}`"
            :position="position"
          />
        </tbody>
      </table>
      <EmptyList v-else :message="$t('trade.emptyPositions')" />
    </TableWrapper>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {
  MarketType,
  UiBinaryOptionsMarketWithToken,
  UiDerivativeMarketWithToken,
  UiPosition
} from '@injectivelabs/sdk-ui-ts'
import MobilePosition from '~/components/partials/common/position/mobile-position.vue'
import Position from '~/components/partials/common/position/position.vue'
import PositionTableHeader from '~/components/partials/common/position/position-table.header.vue'
import TableBody from '~/components/elements/table-body.vue'

export default Vue.extend({
  components: {
    Position,
    MobilePosition,
    PositionTableHeader,
    TableBody
  },

  data() {
    return {
      interval: 0 as any
    }
  },

  computed: {
    market(): UiDerivativeMarketWithToken | undefined {
      return this.$accessor.derivatives.market
    },

    markets(): UiDerivativeMarketWithToken[] {
      return this.$accessor.derivatives.markets
    },

    binaryOptionsMarkets(): UiBinaryOptionsMarketWithToken[] {
      return this.$accessor.derivatives.binaryOptionsMarkets
    },

    positions(): UiPosition[] {
      return this.$accessor.positions.subaccountPositions
    },

    filteredPositions(): UiPosition[] {
      const { binaryOptionsMarkets, market, markets, positions } = this

      if (!market) {
        return []
      }

      const result = positions.filter((position) => {
        return !!markets.find((m) => m.marketId === position.marketId)
      })

      if (market.subType === MarketType.BinaryOptions) {
        return result.filter((position) =>
          binaryOptionsMarkets.some(
            (market) => market.marketId === position.marketId
          )
        )
      }

      return result
    },

    sortedPositions(): UiPosition[] {
      const { filteredPositions } = this

      return [...filteredPositions].sort((p1: UiPosition, p2: UiPosition) => {
        return p1.ticker.localeCompare(p2.ticker)
      })
    }
  },

  mounted() {
    this.$accessor.positions.fetchOpenPositionsMarketsOrderbook()

    this.interval = setInterval(() => {
      this.$accessor.positions.fetchOpenPositionsMarketsOrderbook()
    }, 10000)
  },

  beforeDestroy() {
    clearInterval(this.interval)
  }
})
</script>
