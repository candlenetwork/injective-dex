<template>
  <VCardTableWrap>
    <template #actions>
      <div
        class="col-span-12 sm:col-span-6 lg:col-span-4 grid grid-cols-5 gap-4"
      >
        <VSearch
          dense
          class="col-span-3"
          data-cy="universal-table-filter-by-asset-input"
          :placeholder="$t('trade.filter')"
          :search="search"
          @searched="handleInputOnSearch"
        />
        <FilterSelector
          class="col-span-2"
          data-cy="universal-table-filter-by-side-select"
          :type="TradeSelectorType.PositionSide"
          :value="side"
          @click="handleSideClick"
        />
      </div>

      <div
        class="col-span-12 flex justify-between items-center sm:hidden my-3 text-xs px-3"
      >
        <span class="tracking-widest uppercase tracking-3">
          {{ $t('trade.side') }} / {{ $t('trade.market') }}
        </span>
        <span
          class="text-red-500 cursor-pointer"
          data-cy="trading-account-positions-table-cancel-all-button"
          @click.stop="handleClosePositions"
        >
          {{ $t('trade.closeAll') }}
        </span>
      </div>

      <div
        class="col-span-6 lg:col-span-8 sm:text-right mt-4 sm:mt-0 hidden sm:block"
      >
        <VButton
          v-if="
            filteredPositions.length > 0 &&
            !walletIsCosmosWallet &&
            !hideBalance
          "
          data-cy="trading-account-positions-table-cancel-all-button"
          red-outline
          sm
          :status="status"
          class="rounded"
          @click.stop="handleClosePositions"
        >
          {{ $t('trade.closeAllPositions') }}
        </VButton>
      </div>
    </template>

    <!-- mobile table -->
    <TableBody
      :show-empty="filteredPositions.length === 0"
      class="sm:hidden max-h-lg overflow-y-auto"
    >
      <MobilePosition
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

    <div class="overflow-y-auto mt-4 hidden sm:block">
      <table v-if="filteredPositions.length > 0" class="table relative">
        <PositionTableHeader />
        <tbody>
          <tr
            is="Position"
            v-for="(position, index) in sortedPositions"
            :key="`positions-${index}-${position.marketId}`"
            :position="position"
            :hide-balance="hideBalance"
          />
        </tbody>
      </table>

      <EmptyList
        v-else
        :message="$t('trade.emptyPositions')"
        class="min-h-orders"
      />
    </div>
  </VCardTableWrap>
</template>

<script lang="ts">
import { Status, StatusType } from '@injectivelabs/utils'
import Vue from 'vue'
import {
  UiPosition,
  UiDerivativeMarketWithToken
} from '@injectivelabs/sdk-ui-ts'
import { isCosmosWallet, Wallet } from '@injectivelabs/wallet-ts'
import { GeneralException } from '@injectivelabs/exceptions'
import MobilePosition from '~/components/partials/common/position/mobile-position.vue'
import Position from '~/components/partials/common/position/position.vue'
import PositionTableHeader from '~/components/partials/common/position/position-table.header.vue'
import FilterSelector from '~/components/partials/common/elements/filter-selector.vue'
import TableBody from '~/components/elements/table-body.vue'
import { TradeSelectorType } from '~/types/enums'

export default Vue.extend({
  components: {
    Position,
    FilterSelector,
    MobilePosition,
    PositionTableHeader,
    TableBody
  },

  props: {
    hideBalance: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      TradeSelectorType,
      search: '',
      side: undefined as string | undefined,
      status: new Status(StatusType.Idle)
    }
  },

  computed: {
    wallet(): Wallet {
      return this.$accessor.wallet.wallet
    },

    positions(): UiPosition[] {
      return this.$accessor.positions.subaccountPositions
    },

    markets(): UiDerivativeMarketWithToken[] {
      return this.$accessor.derivatives.markets
    },

    filteredPositions(): UiPosition[] {
      const { positions, markets, search, side } = this

      return positions.filter((p) => {
        const market = markets.find((m) => m.marketId === p.marketId)

        if (!market) {
          return false
        }

        if (!search && !side) {
          return true
        }

        const isPartOfSearchFilter =
          !search ||
          market.ticker.toLowerCase().includes(search.trim().toLowerCase())
        const isPartOfSideFilter = !side || p.direction === side

        return isPartOfSearchFilter && isPartOfSideFilter
      })
    },

    sortedPositions(): UiPosition[] {
      const { filteredPositions } = this

      return [...filteredPositions].sort((p1: UiPosition, p2: UiPosition) => {
        return p1.ticker.localeCompare(p2.ticker)
      })
    },

    walletIsCosmosWallet(): boolean {
      const { wallet } = this

      return isCosmosWallet(wallet)
    }
  },

  methods: {
    closeAllPositions(): Promise<void> {
      const { filteredPositions } = this

      return this.$accessor.positions.closeAllPosition(filteredPositions)
    },

    closePosition(): Promise<void> {
      const { filteredPositions, markets } = this

      const [position] = filteredPositions
      const market = markets.find((m) => m.marketId === position.marketId)

      if (!market) {
        return Promise.reject(
          new GeneralException(
            Error(
              this.$t('trade.position_market_not_found', {
                marketId: position.marketId
              })
            )
          )
        )
      }

      return this.$accessor.positions.closePosition({
        position,
        market
      })
    },

    handleClosePositions() {
      const { filteredPositions } = this

      this.status.setLoading()

      const action =
        filteredPositions.length === 1
          ? this.closePosition
          : this.closeAllPositions

      action()
        .then(() => {
          this.$toast.success(this.$t('trade.positions_closed'))
        })
        .catch(this.$onRejected)
        .finally(() => {
          this.status.setIdle()
        })
    },

    handleInputOnSearch(search: string) {
      this.search = search
    },

    handleSideClick(side: string | undefined) {
      this.side = side
    }
  }
})
</script>
