<template>
  <HocLoading :status="status">
    <div class="w-full h-full flex flex-col">
      <Toolbar>
        <template #filters>
          <div
            class="grid grid-cols-2 sm:grid-cols-4 items-center gap-4 w-full"
          >
            <SearchAsset
              class="col-span-4 sm:col-span-1"
              :markets="markets"
              :value="selectedToken"
              @select="handleSearch"
            />

            <FilterSelector
              data-cy="universal-table-filter-by-type-drop-down"
              :type="TradeSelectorType.TypeAllDerivatives"
              :value="type"
              @click="handleTypeClick"
            />

            <FilterSelector
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

        <template #actions>
          <VButton
            v-if="triggers.length > 0"
            red-outline
            md
            data-cy="activity-cancel-all-button"
            @click.stop="handleCancelOrders"
          >
            <span class="whitespace-nowrap">
              {{ $t('trade.cancelAllOrders') }}
            </span>
          </VButton>
        </template>
      </Toolbar>

      <TableBody
        :show-empty="triggers.length === 0"
        class="sm:hidden mt-3 max-h-lg overflow-y-auto"
      >
        <MobileTrigger
          v-for="(trigger, index) in triggers"
          :key="`mobile-derivative-triggers-${index}-${trigger.orderHash}`"
          class="col-span-1"
          :order="trigger"
        />

        <EmptyList slot="empty" :message="$t('trade.emptyTriggers')" />
      </TableBody>

      <TableWrapper break-md class="mt-4 hidden sm:block">
        <table v-if="triggers.length > 0" class="table">
          <TriggersTableHeader />
          <tbody>
            <tr
              is="Trigger"
              v-for="(trigger, index) in triggers"
              :key="`trigger-${index}`"
              :trigger="trigger"
            ></tr>
          </tbody>
        </table>
        <EmptyList
          v-else
          :message="$t('trade.emptyTriggers')"
          data-cy="universal-table-nothing-found"
        />
      </TableWrapper>

      <Pagination
        v-if="status.isIdle() && triggers.length > 0"
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
import Vue from 'vue'
import { Status, StatusType } from '@injectivelabs/utils'
import { Token } from '@injectivelabs/token-metadata'
import {
  UiDerivativeMarketWithToken,
  UiDerivativeOrderHistory
} from '@injectivelabs/sdk-ui-ts'
import { TradeDirection, TradeExecutionType } from '@injectivelabs/ts-types'
import { orderTypeToOrderTypes } from '../common/utils'
import { ConditionalOrderSide } from '../common/types'
import FilterSelector from '~/components/partials/common/elements/filter-selector.vue'
import Pagination from '~/components/partials/common/pagination.vue'
import SearchAsset from '~/components/partials/activity/common/search-asset.vue'
import ClearFiltersButton from '~/components/partials/activity/common/clear-filters-button.vue'
import Toolbar from '~/components/partials/activity/common/toolbar.vue'
import Trigger from '~/components/partials/common/derivatives/trigger.vue'
import TriggersTableHeader from '~/components/partials/common/derivatives/triggers-table-header.vue'
import { UI_DEFAULT_PAGINATION_LIMIT_COUNT } from '~/app/utils/constants'
import { OrderTypeFilter, TradeSelectorType } from '~/types'
import TableBody from '~/components/elements/table-body.vue'
import MobileTrigger from '~/components/partials/common/derivatives/mobile-trigger.vue'

export default Vue.extend({
  components: {
    Trigger,
    Toolbar,
    Pagination,
    SearchAsset,
    FilterSelector,
    ClearFiltersButton,
    TriggersTableHeader,
    TableBody,
    MobileTrigger
  },

  data() {
    return {
      TradeSelectorType,
      type: undefined as OrderTypeFilter | undefined,
      side: undefined as string | undefined,
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

    triggers(): UiDerivativeOrderHistory[] {
      return this.$accessor.derivatives.subaccountConditionalOrders
    },

    markets(): UiDerivativeMarketWithToken[] {
      return this.$accessor.derivatives.markets
    },

    totalCount(): number {
      return this.$accessor.derivatives.subaccountConditionalOrdersPagination
        .total
    },

    totalPages(): number {
      const { totalCount, limit } = this

      return Math.ceil(totalCount / limit)
    },

    showClearFiltersButton(): boolean {
      return !!this.selectedToken || !!this.type || !!this.side
    },

    paginationOrderTypes(): ConditionalOrderSide[] {
      const { type } = this

      if (!type) {
        return []
      }

      if (!type.executionType) {
        return []
      }

      return orderTypeToOrderTypes(type.orderType)
    },

    paginationExecutionTypes(): TradeExecutionType[] | undefined {
      const { type } = this

      if (!type) {
        return undefined
      }

      if (!type.executionType) {
        return undefined
      }

      return [type.executionType] as TradeExecutionType[]
    }
  },

  mounted() {
    this.fetchTriggers()
  },

  methods: {
    fetchTriggers(): Promise<void> {
      const direction = this.side as TradeDirection
      const marketId = this.markets.find((m) => {
        return (
          m.baseToken.symbol === this.selectedToken?.symbol ||
          m.quoteToken.symbol === this.selectedToken?.symbol
        )
      })?.marketId

      this.status.setLoading()

      return this.$accessor.derivatives
        .fetchSubaccountConditionalOrders({
          pagination: {
            skip: (this.page - 1) * this.limit,
            limit: this.limit
          },
          filters: {
            marketId,
            orderTypes: this.paginationOrderTypes,
            executionTypes: this.paginationExecutionTypes,
            direction
          }
        })
        .catch(this.$onError)
        .finally(() => {
          this.status.setIdle()
          this.$emit('update')
        })
    },

    handleSideClick(side: string | undefined) {
      this.side = side

      this.resetPagination()
      this.fetchTriggers()
    },

    handleTypeClick(type: OrderTypeFilter | undefined) {
      this.type = type

      this.resetPagination()
      this.fetchTriggers()
    },

    handleLimitChangeEvent(limit: number) {
      this.limit = limit

      this.resetPagination()
      this.fetchTriggers()
    },

    handlePageChangeEvent(page: number) {
      this.page = page

      this.fetchTriggers()
    },

    handleSearch(token: Token) {
      this.selectedToken = token

      this.resetPagination()
      this.fetchTriggers()
    },

    handleClearFilters() {
      this.selectedToken = undefined
      this.side = undefined
      this.type = undefined

      this.resetPagination()
      this.fetchTriggers()
    },

    cancelAllOrder(): Promise<void> {
      const { triggers } = this

      return this.$accessor.derivatives.batchCancelOrder(triggers)
    },

    cancelOrder(): Promise<void> {
      const { triggers } = this

      const [trigger] = triggers

      return this.$accessor.derivatives.cancelOrder(trigger)
    },

    handleCancelOrders() {
      const { triggers } = this

      const action =
        triggers.length === 1 ? this.cancelOrder : this.cancelAllOrder

      action()
        .then(() => {
          this.$toast.success(this.$t('trade.orders_cancelled'))
        })
        .catch(this.$onRejected)
    },

    resetPagination() {
      this.page = 1
    }
  }
})
</script>
