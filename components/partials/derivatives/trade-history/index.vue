<template>
  <div v-if="market" class="h-full">
    <!-- mobile table -->
    <TableBody
      :show-empty="trades.length === 0"
      class="sm:hidden max-h-lg overflow-y-auto"
    >
      <MobileTrade
        v-for="(trade, index) in trades"
        :key="`mobile-trade-history-${index}`"
        class="col-span-1"
        :trade="trade"
        @showTradeDetails="handleShowTradeDetails"
      />

      <EmptyList
        slot="empty"
        :message="$t('trade.emptyTrades')"
        class="min-h-orders"
      />
    </TableBody>

    <TableWrapper class="hidden sm:block">
      <table v-if="trades.length > 0" class="table">
        <TradesTableHeader />
        <tbody>
          <tr
            is="Trade"
            v-for="(trade, index) in trades"
            :key="`trades-history-${index}`"
            :trade="trade"
          />
        </tbody>
      </table>
      <EmptyList v-else :message="$t('trade.emptyTrades')" />
    </TableWrapper>

    <ModalMobileTradeDetails :trade="tradeDetails" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {
  UiDerivativeMarketWithToken,
  UiDerivativeTrade
} from '@injectivelabs/sdk-ui-ts'
import MobileTrade from '~/components/partials/common/trade/mobile-trade.vue'
import ModalMobileTradeDetails from '~/components/partials/modals/mobile-trade-details.vue'
import Trade from '~/components/partials/common/trade/trade.vue'
import TradesTableHeader from '~/components/partials/common/trade/trades-table-header.vue'
import TableBody from '~/components/elements/table-body.vue'
import { Modal } from '~/types'

export default Vue.extend({
  components: {
    Trade,
    MobileTrade,
    ModalMobileTradeDetails,
    TableBody,
    TradesTableHeader
  },

  data() {
    return {
      tradeDetails: undefined as UiDerivativeTrade | undefined
    }
  },

  computed: {
    market(): UiDerivativeMarketWithToken | undefined {
      return this.$accessor.derivatives.market
    },

    trades(): UiDerivativeTrade[] {
      return this.$accessor.derivatives.subaccountTrades
    }
  },

  methods: {
    handleShowTradeDetails(trade: UiDerivativeTrade) {
      this.tradeDetails = trade
      this.$accessor.modal.openModal({ type: Modal.MobileTradeDetails })
    }
  }
})
</script>
