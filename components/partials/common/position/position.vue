<template>
  <tr v-if="market" :data-cy="'open-position-table-row-' + position.ticker">
    <td class="text-left cursor-pointer" @click="handleClickOnMarket">
      <div class="flex items-center justify-start">
        <div v-if="baseTokenLogo" class="w-4 h-4">
          <img
            :src="baseTokenLogo"
            :alt="market.baseToken.name"
            class="min-w-full h-auto rounded-full"
          />
        </div>
        <div class="ml-2">
          <span
            class="text-white text-xs"
            data-cy="open-position-ticker-name-table-data"
          >
            {{ position.ticker }}
          </span>
        </div>
      </div>
    </td>

    <td class="text-left pl-1text-xs">
      <span
        data-cy="open-position-trade-direction-table-data"
        class="text-xs"
        :class="{
          'text-green-500': position.direction === TradeDirection.Long,
          'text-red-500': position.direction === TradeDirection.Short
        }"
      >
        {{ directionLocalized }}
      </span>
    </td>

    <td class="text-right font-mono text-white text-xs">
      <span v-if="hideBalance">{{ HIDDEN_BALANCE_DISPLAY }}</span>
      <VNumber
        v-else
        xs
        :decimals="
          market ? market.quantityDecimals : UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS
        "
        :number="quantity"
        data-cy="open-position-quantity-table-data"
      />
    </td>

    <td class="text-right font-mono text-white text-xs">
      <span v-if="hideBalance">{{ HIDDEN_BALANCE_DISPLAY }}</span>
      <div v-else>
        <VNumber
          xs
          :decimals="priceDecimal"
          :number="price"
          data-cy="open-position-price-table-data"
        />
        <span v-if="!markPrice.isNaN()" class="text-gray-500 text-xs">
          {{ markPriceToFormat }}
        </span>
      </div>
    </td>

    <td
      v-if="!isBinaryOptionsPage"
      class="text-right font-mono text-white text-xs"
    >
      <span v-if="isBinaryOptions">&mdash;</span>
      <span v-else-if="hideBalance">{{ HIDDEN_BALANCE_DISPLAY }}</span>
      <VNumber
        v-else
        xs
        :decimals="priceDecimal"
        :number="liquidationPrice"
        data-cy="open-position-liquidation-price-table-data"
      />
    </td>
    <td class="text-right">
      <span v-if="hideBalance" class="font-mono text-white text-xs">
        {{ HIDDEN_BALANCE_DISPLAY }}
      </span>
      <div
        v-else-if="!pnl.isNaN()"
        class="flex items-center justify-end font-medium text-xs font-mono"
        :class="pnlClass"
      >
        <div class="flex items-end flex-col">
          <span class="flex items-center">
            <span class="mr-1">≈</span>
            <span>{{ pnl.gte(0) ? '+' : '' }}</span>
            <span
              data-cy="postion-entry-pnl"
              :class="{
                'text-green-500': pnl.gte(0),
                'text-red-500': pnl.lt(0)
              }"
            >
              {{ pnlToFormat }}
            </span>
            <span class="ml-1 text-2xs">{{ market.quoteToken.symbol }}</span>
          </span>
          <span class="flex mt-1">
            {{ (percentagePnl.gte(0) ? '+' : '') + percentagePnl.toFormat(2) }}%
          </span>
        </div>
      </div>
      <span
        v-else
        class="text-white text-xs"
        data-cy="open-position-no-pnl-table-data"
      >
        {{ $t('trade.not_available_n_a') }}
      </span>
    </td>
    <td class="text-right font-mono text-white text-xs">
      <span v-if="hideBalance">
        {{ HIDDEN_BALANCE_DISPLAY }}
      </span>
      <VNumber
        v-else
        xs
        :decimals="priceDecimal"
        :number="notionalValue"
        data-cy="open-position-total-table-data"
      >
        <span slot="addon" class="text-2xs text-gray-500">
          {{ market.quoteToken.symbol }}
        </span>
      </VNumber>
    </td>
    <td class="text-right font-mono text-white text-xs">
      <span v-if="hideBalance">
        {{ HIDDEN_BALANCE_DISPLAY }}
      </span>
      <div v-else class="flex items-center justify-end">
        <VNumber
          xs
          data-cy="open-position-margin-table-data"
          :decimals="priceDecimal"
          :number="margin"
        />
        <button
          v-if="!isBinaryOptions"
          role="button"
          type="button"
          class="border border-gray-500 text-gray-500 hover:text-primary-500 hover:border-primary-500 ml-2 px-1"
          data-cy="open-position-add-margin-button"
          @click.stop.prevent="onAddMarginButtonClick"
        >
          &plus;
        </button>
      </div>
    </td>
    <td v-if="!isBinaryOptionsPage" class="text-right font-mono">
      <span v-if="isBinaryOptions" class="text-white text-xs">&mdash;</span>
      <span v-else-if="hideBalance" class="text-white text-xs">{{
        HIDDEN_BALANCE_DISPLAY
      }}</span>
      <span
        v-else-if="effectiveLeverage.gte(0)"
        class="flex items-center justify-end text-white text-xs"
        data-cy="open-position-leverage-table-data"
      >
        {{ effectiveLeverage.toFormat(2) }}
        <span class="text-gray-300">&times;</span>
      </span>
      <span
        v-else
        class="text-gray-500 text-xs"
        data-cy="open-position-no-leverage-table-data"
      >
        {{ $t('trade.not_available_n_a') }}
      </span>
    </td>

    <td class="text-center relative">
      <VButton
        v-if="!hideBalance"
        data-cy="open-position-cancel-link"
        :status="status"
        class="rounded w-6 h-6"
        @click="onClosePositionClick"
      >
        <div
          class="flex items-center justify-center rounded-full bg-opacity-10 w-6 h-6 hover:bg-opacity-10 bg-red-500 hover:bg-red-600 text-red-500 hover:text-red-600"
        >
          <IconClose class="h-4 w-4" />
        </div>
      </VButton>
    </td>
  </tr>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { Status, BigNumberInWei, BigNumberInBase } from '@injectivelabs/utils'
import { TradeDirection } from '@injectivelabs/ts-types'
import {
  getTokenLogoWithVendorPathPrefix,
  MarketType,
  UiDerivativeLimitOrder,
  UiDerivativeMarketWithToken,
  UiPosition,
  ZERO_IN_BASE
} from '@injectivelabs/sdk-ui-ts'
import {
  HIDDEN_BALANCE_DISPLAY,
  UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS,
  UI_DEFAULT_BINARY_OPTIONS_PRICE_DECIMALS,
  UI_DEFAULT_PRICE_DISPLAY_DECIMALS
} from '~/app/utils/constants'
import { getMarketRoute } from '~/app/utils/market'
import { derivativeMarketRouteNames } from '~/app/data/market'

export default Vue.extend({
  props: {
    position: {
      required: true,
      type: Object as PropType<UiPosition>
    },

    hideBalance: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      HIDDEN_BALANCE_DISPLAY,
      UI_DEFAULT_PRICE_DISPLAY_DECIMALS,
      UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS,
      TradeDirection,
      status: new Status()
    }
  },

  computed: {
    currentMarket(): UiDerivativeMarketWithToken | undefined {
      return this.$accessor.derivatives.market
    },

    currentOrders(): UiDerivativeLimitOrder[] {
      return this.$accessor.derivatives.subaccountOrders
    },

    markets(): UiDerivativeMarketWithToken[] {
      return this.$accessor.derivatives.markets
    },

    reduceOnlyCurrentOrders(): UiDerivativeLimitOrder[] {
      const { currentOrders, position } = this

      return currentOrders.filter(
        (order) => order.isReduceOnly && order.marketId === position.marketId
      )
    },

    hasReduceOnlyOrders(): boolean {
      const { reduceOnlyCurrentOrders } = this

      return reduceOnlyCurrentOrders.length > 0
    },

    isOnMarketPage(): boolean {
      return derivativeMarketRouteNames.includes(this.$route.name as string)
    },

    market(): UiDerivativeMarketWithToken | undefined {
      const { markets, position } = this

      return markets.find((m) => m.marketId === position.marketId)
    },

    isBinaryOptionsPage(): boolean {
      return this.$route.name === 'binary-options-binaryOption'
    },

    isBinaryOptions(): boolean {
      const { market } = this

      if (!market) {
        return false
      }

      return market.subType === MarketType.BinaryOptions
    },

    priceDecimal(): number {
      const { isBinaryOptions, market } = this

      if (isBinaryOptions) {
        return UI_DEFAULT_BINARY_OPTIONS_PRICE_DECIMALS
      }

      return market ? market.priceDecimals : UI_DEFAULT_PRICE_DISPLAY_DECIMALS
    },

    price(): BigNumberInBase {
      const { market, position } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInWei(position.entryPrice).toBase(
        market.quoteToken.decimals
      )
    },

    margin(): BigNumberInBase {
      const { market, position } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInWei(position.margin).toBase(
        market.quoteToken.decimals
      )
    },

    quantity(): BigNumberInBase {
      const { market, position } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInBase(position.quantity)
    },

    markPrice(): BigNumberInBase {
      const { market, position } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInWei(position.markPrice).toBase(
        market.quoteToken.decimals
      )
    },

    notionalValue(): BigNumberInBase {
      const { market, quantity, markPrice, price, isBinaryOptions } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return isBinaryOptions ? price.times(quantity) : markPrice.times(quantity)
    },

    liquidationPrice(): BigNumberInBase {
      const { position, market } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      const liquidationPrice = new BigNumberInWei(
        position.liquidationPrice
      ).toBase(market.quoteToken.decimals)

      return liquidationPrice.gt(0) ? liquidationPrice : new BigNumberInBase(0)
    },

    bankruptcyPrice(): BigNumberInBase {
      const { market, price, margin, position, quantity } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      const isPositionLong = position.direction === TradeDirection.Long
      const unitMargin = new BigNumberInBase(margin).dividedBy(quantity)

      return isPositionLong ? price.minus(unitMargin) : price.plus(unitMargin)
    },

    feeAdjustedBankruptcyPrice(): BigNumberInBase {
      const { bankruptcyPrice, position, market } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      const minTickPrice = new BigNumberInBase(
        new BigNumberInBase(1).shiftedBy(-market.priceDecimals)
      )
      const isPositionLong = position.direction === TradeDirection.Long
      const feeAdjustedBankruptcyPrice = isPositionLong
        ? bankruptcyPrice.dividedBy(
            new BigNumberInBase(1).minus(market.takerFeeRate)
          )
        : bankruptcyPrice.dividedBy(
            new BigNumberInBase(1).plus(market.takerFeeRate)
          )

      return feeAdjustedBankruptcyPrice.gt(0)
        ? feeAdjustedBankruptcyPrice
        : minTickPrice
    },

    pnl(): BigNumberInBase {
      const { markPrice, market, position, price } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInBase(position.quantity)
        .times(markPrice.minus(price))
        .times(position.direction === TradeDirection.Long ? 1 : -1)
    },

    pnlToFormat(): string {
      const { market, pnl } = this

      if (!market) {
        return pnl.toFormat(UI_DEFAULT_PRICE_DISPLAY_DECIMALS)
      }

      return pnl.toFormat(market.priceDecimals)
    },

    markPriceToFormat(): string {
      const { market, markPrice } = this

      if (!market) {
        return markPrice.toFormat(UI_DEFAULT_PRICE_DISPLAY_DECIMALS)
      }

      return markPrice.toFormat(market.priceDecimals)
    },

    percentagePnl(): BigNumberInBase {
      const { pnl, market, margin } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      if (pnl.isNaN()) {
        return ZERO_IN_BASE
      }

      return new BigNumberInBase(pnl.dividedBy(margin).times(100))
    },

    pnlClass(): string {
      const { pnl } = this

      if (pnl.isNaN()) {
        return ''
      }

      return pnl.gte(0) ? 'text-green-500' : 'text-red-500'
    },

    effectiveLeverage(): BigNumberInBase {
      const { pnl, notionalValue, margin, market } = this

      if (!market || margin.lte(0) || notionalValue.lte(0) || pnl.isNaN()) {
        return ZERO_IN_BASE
      }

      const effectiveLeverage = new BigNumberInBase(
        notionalValue.dividedBy(margin.plus(pnl))
      )

      return effectiveLeverage.gt(0)
        ? effectiveLeverage
        : new BigNumberInBase(0)
    },

    notEnoughLiquidityError(): string | undefined {
      const { pnl, market } = this

      if (!market) {
        return
      }

      if (pnl.isNaN()) {
        return this.$t('trade.no_liquidity')
      }

      return undefined
    },

    positionCloseError(): string | undefined {
      const { notEnoughLiquidityError, market } = this

      if (!market) {
        return
      }

      if (notEnoughLiquidityError) {
        return notEnoughLiquidityError
      }

      return undefined
    },

    directionLocalized(): string {
      const { position } = this

      return position.direction === TradeDirection.Long
        ? this.$t('trade.long')
        : this.$t('trade.short')
    },

    baseTokenLogo(): string {
      const { market } = this

      if (!market) {
        return ''
      }

      if (!market.baseToken) {
        return ''
      }

      return getTokenLogoWithVendorPathPrefix(market.baseToken.logo)
    }
  },

  methods: {
    onAddMarginButtonClick() {
      this.$root.$emit('add-margin-to-position', this.position)
    },

    onClosePositionClick() {
      const { positionCloseError, market } = this

      if (!market) {
        return
      }

      if (positionCloseError) {
        return this.$toast.error(positionCloseError)
      }

      return this.handleClosePosition()
    },

    handleClosePosition() {
      const { hasReduceOnlyOrders } = this

      if (hasReduceOnlyOrders) {
        return this.closePositionAndReduceOnlyOrders()
      }

      return this.closePosition()
    },

    closePosition() {
      const { position, market } = this

      if (!market) {
        return
      }

      this.status.setLoading()

      this.$accessor.positions
        .closePosition({
          position,
          market
        })
        .then(() => {
          this.$toast.success(this.$t('trade.position_closed'))
        })
        .catch(this.$onRejected)
        .finally(() => {
          this.status.setIdle()
        })
    },

    closePositionAndReduceOnlyOrders() {
      const { position, market, reduceOnlyCurrentOrders } = this

      if (!market) {
        return
      }
      this.status.setLoading()

      this.$accessor.positions
        .closePositionAndReduceOnlyOrders({
          market,
          position,
          reduceOnlyOrders: reduceOnlyCurrentOrders
        })
        .then(() => {
          this.$toast.success(this.$t('trade.position_closed'))
        })
        .catch(this.$onRejected)
        .finally(() => {
          this.status.setIdle()
        })
    },

    handleClickOnMarket() {
      const { market } = this

      if (!market) {
        return
      }

      return this.$router.push(getMarketRoute(market))
    }
  }
})
</script>
