<template>
  <HocLoading :status="status">
    <div class="w-full h-full flex flex-col">
      <Toolbar>
        <template #filters>
          <div class="grid grid-cols-4 items-center gap-4 w-full">
            <SearchAsset
              class="col-span-4 sm:col-span-1"
              :markets="markets"
              :value="selectedToken"
              @select="handleSearch"
            />

            <FilterSelector
              class="col-span-2 sm:col-span-1"
              data-cy="universal-table-filter-by-type-drop-down"
              :type="TradeSelectorType.Type"
              :value="type"
              @click="handleTypeClick"
            />

            <FilterSelector
              class="col-span-2 sm:col-span-1"
              data-cy="universal-table-filter-by-side-drop-down"
              :type="TradeSelectorType.Side"
              :value="side"
              @click="handleSideClick"
            />

            <ClearFiltersButton
              v-if="showClearFiltersButton"
              @clear="handleClearFilters"
            />
          </div>
        </template>
      </Toolbar>

      <!-- mobile table -->
      <TableBody
        :show-empty="trades.length === 0"
        class="sm:hidden mt-3 max-h-lg overflow-y-auto"
      >
        <MobileTrade
          v-for="(trade, index) in trades"
          :key="`mobile-derivative-trade-${index}`"
          class="col-span-1"
          :trade="trade"
          @showTradeDetails="handleShowTradeDetails"
        />

        <EmptyList slot="empty" :message="$t('trade.emptyTrades')" />
      </TableBody>

      <TableWrapper break-md class="mt-4 hidden sm:block">
        <table v-if="trades.length > 0" class="table">
          <TradesTableHeader />
          <tbody>
            <tr
              is="Trade"
              v-for="(trade, index) in trades"
              :key="`trade-${index}`"
              :trade="trade"
            ></tr>
          </tbody>
        </table>
        <EmptyList
          v-else
          :message="$t('trade.emptyTrades')"
          data-cy="universal-table-nothing-found"
        />
      </TableWrapper>

      <ModalMobileTradeFilter
        :type="type"
        :side="side"
        @type:update="handleTypeClick"
        @side:update="handleSideClick"
      />

      <ModalMobileTradeDetails :trade="tradeDetails" />

      <Pagination
        v-if="status.isIdle() && trades.length > 0"
        class="mt-4"
        v-bind="{
          limit,
          page,
          totalPages,
          totalCount
        }"
        @update:limit="handleLimitChangeEvent"
        @update:page="handlePageChangeEvent"
      />
    </div>
  </HocLoading>
</template>

<script lang="ts">
import { Status, StatusType } from '@injectivelabs/utils'
import Vue from 'vue'
import {
  UiDerivativeTrade,
  UiDerivativeMarketWithToken
} from '@injectivelabs/sdk-ui-ts'
import { Token } from '@injectivelabs/token-metadata'
import { TradeDirection } from '@injectivelabs/ts-types'
import { tradeTypesToTradeExecutionTypes } from '@/components/partials/activity/common/utils'
import Trade from '~/components/partials/common/trade/trade.vue'
import MobileTrade from '~/components/partials/common/trade/mobile-trade.vue'
import TradesTableHeader from '~/components/partials/common/trade/trades-table-header.vue'
import FilterSelector from '~/components/partials/common/elements/filter-selector.vue'
import ModalMobileTradeFilter from '~/components/partials/modals/mobile-trade-filter.vue'
import ModalMobileTradeDetails from '~/components/partials/modals/mobile-trade-details.vue'
import TableBody from '~/components/elements/table-body.vue'
import { TradeSelectorType, TradeTypes } from '~/types/enums'
import { Modal } from '~/types'
import { UI_DEFAULT_PAGINATION_LIMIT_COUNT } from '~/app/utils/constants'
import Pagination from '~/components/partials/common/pagination.vue'
import SearchAsset from '@/components/partials/activity/common/search-asset.vue'
import ClearFiltersButton from '@/components/partials/activity/common/clear-filters-button.vue'
import Toolbar from '@/components/partials/activity/common/toolbar.vue'

export default Vue.extend({
  components: {
    Trade,
    FilterSelector,
    MobileTrade,
    ModalMobileTradeDetails,
    ModalMobileTradeFilter,
    TableBody,
    TradesTableHeader,
    Pagination,
    SearchAsset,
    ClearFiltersButton,
    Toolbar
  },

  data() {
    return {
      TradeSelectorType,
      search: '',
      type: undefined as string | undefined,
      side: undefined as string | undefined,
      tradeDetails: undefined as UiDerivativeTrade | undefined,
      status: new Status(StatusType.Loading),
      page: 1,
      limit: UI_DEFAULT_PAGINATION_LIMIT_COUNT,
      selectedToken: undefined as Token | undefined
    }
  },

  computed: {
    activeMarketIds(): string[] {
      return this.$accessor.derivatives.activeMarketIds
    },

    markets(): UiDerivativeMarketWithToken[] {
      return this.$accessor.derivatives.markets
    },

    trades(): UiDerivativeTrade[] {
      return this.$accessor.derivatives.subaccountTrades
    },

    totalCount(): number {
      return this.$accessor.derivatives.subaccountTradesPagination.total
    },

    totalPages(): number {
      const { totalCount, limit } = this

      return Math.ceil(totalCount / limit)
    },

    showClearFiltersButton(): boolean {
      return !!this.selectedToken || !!this.type || !!this.side
    },

    skip(): number {
      const { page, limit } = this

      return (page - 1) * limit
    }
  },

  mounted() {
    this.fetchTrades()
  },

  methods: {
    fetchTrades(): Promise<void> {
      const { skip, limit, activeMarketIds: marketIds } = this

      const types = tradeTypesToTradeExecutionTypes(this.type as TradeTypes)
      const direction = this.side as TradeDirection
      const marketId = this.markets.find((m) => {
        return (
          m.baseToken.symbol === this.selectedToken?.symbol ||
          m.quoteToken.symbol === this.selectedToken?.symbol
        )
      })?.marketId

      this.status.setLoading()

      return Promise.all([
        this.$accessor.derivatives.fetchSubaccountTrades({
          pagination: {
            skip,
            limit
          },
          filters: {
            types,
            direction,
            marketId,
            marketIds
          }
        })
      ])
        .then(() => {
          //
        })
        .catch(this.$onError)
        .finally(() => {
          this.status.setIdle()
        })
    },

    handleSideClick(side: string | undefined) {
      this.side = side

      this.resetPagination()
      this.fetchTrades()
    },

    handleTypeClick(type: string | undefined) {
      this.type = type

      this.resetPagination()
      this.fetchTrades()
    },

    handleShowTradeDetails(trade: UiDerivativeTrade) {
      this.tradeDetails = trade

      this.$accessor.modal.openModal({ type: Modal.MobileTradeFilter })
    },

    openMobileFilterModal() {
      this.$accessor.modal.openModal({ type: Modal.MobileTradeFilter })
    },

    handleLimitChangeEvent(limit: number) {
      this.limit = limit

      this.resetPagination()
      this.fetchTrades()
    },

    handlePageChangeEvent(page: number) {
      this.page = page

      this.fetchTrades()
    },

    handleSearch(token: Token) {
      this.selectedToken = token

      this.resetPagination()
      this.fetchTrades()
    },

    handleClearFilters() {
      this.selectedToken = undefined
      this.side = undefined
      this.type = undefined

      this.resetPagination()
      this.fetchTrades()
    },

    resetPagination() {
      this.page = 1
    }
  }
})
</script>
