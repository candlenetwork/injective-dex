<template>
  <tr
    v-if="market"
    :data-cy="'derivative-order-table-row-' + market.ticker"
    :data-cy-hash="order.orderHash"
  >
    <td class="h-12 text-left cursor-pointer" @click="handleClickOnMarket">
      <div class="flex items-center justify-start">
        <div v-if="baseTokenLogo" class="w-4 h-4">
          <img
            :src="baseTokenLogo"
            :alt="market.baseToken.name"
            class="min-w-full h-auto rounded-full"
          />
        </div>
        <div class="ml-3">
          <span
            class="text-gray-200 text-xs"
            data-cy="derivative-order-ticker-name-table-data"
          >
            {{ market.ticker }}
          </span>
        </div>
      </div>
    </td>

    <td class="h-12 text-left">
      <span
        data-cy="derivative-order-order-side-table-data"
        class="text-xs"
        :class="{
          'text-green-500': order.orderSide === DerivativeOrderSide.Buy,
          'text-red-500': order.orderSide === DerivativeOrderSide.Sell
        }"
      >
        {{ orderSideLocalized }}
      </span>
      <span
        v-if="isReduceOnly"
        class="ml-0.5 text-xs text-gray-500"
        data-cy="derivative-order-reduce-only-table-data"
      >
        {{ $t('trade.reduce_only') }}
      </span>
    </td>

    <td class="h-12 font-mono text-right">
      <VNumber
        xs
        data-cy="derivative-order-price-table-data"
        :decimals="
          market ? market.priceDecimals : UI_DEFAULT_PRICE_DISPLAY_DECIMALS
        "
        :number="price"
      />
    </td>

    <td class="h-12 text-right font-mono">
      <VNumber
        xs
        data-cy="derivative-order-quantity-table-data"
        :decimals="
          market ? market.quantityDecimals : UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS
        "
        :number="quantity"
      />
    </td>

    <td class="h-12 font-mono">
      <div class="flex items-center justify-end">
        <VNumber
          xs
          data-cy="derivative-order-unfilled-quantity-table-data"
          :decimals="
            market
              ? market.quantityDecimals
              : UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS
          "
          :number="unfilledQuantity"
        />
      </div>
    </td>

    <td class="h-12 text-right font-mono">
      <VNumber
        xs
        data-cy="derivative-order-filled-quantity-table-data"
        :decimals="
          market ? market.quantityDecimals : UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS
        "
        :number="filledQuantity"
      />
    </td>

    <td v-if="!isBinaryOptionsPage" class="h-12 text-right font-mono">
      <span
        v-if="leverage.gte(0)"
        class="flex items-center justify-end text-xs"
        data-cy="derivative-order-leverage-table-data"
      >
        {{ leverage.toFormat(2) }}
        <span class="text-gray-300 text-xs">&times;</span>
      </span>
      <span
        v-else
        class="text-gray-400 text-xs"
        data-cy="derivative-order-no-leverage-table-data"
      >
        {{ $t('trade.not_available_n_a') }}
      </span>
    </td>

    <td class="h-12 font-right text-right">
      <VNumber
        xs
        data-cy="derivative-order-total-table-data"
        :decimals="
          market ? market.priceDecimals : UI_DEFAULT_PRICE_DISPLAY_DECIMALS
        "
        :number="total"
      >
        <span slot="addon" class="text-xs text-gray-500">
          {{ market.quoteToken.symbol }}
        </span>
      </VNumber>
    </td>

    <td class="h-12 relative text-right">
      <div class="flex items-center justify-end">
        <span
          v-if="false"
          class="cursor-pointer text-primary-500 mr-6"
          data-cy="derivative-order-view-link"
          @click="handleClickOnMarket"
        >
          {{ $t('common.view') }}
        </span>
        <VButton
          v-if="orderFillable"
          :status="status"
          data-cy="derivative-order-cancel-link"
          class="rounded w-6 h-6"
          @click="onCancelOrder"
        >
          <div
            class="flex items-center justify-center rounded-full w-6 h-6 bg-red-500 bg-opacity-10 text-red-500 hover:bg-red-600 hover:text-red-600 hover:bg-opacity-10"
          >
            <IconBin />
          </div>
        </VButton>
        <span v-else class="inline-block">&mdash;</span>
      </div>
    </td>
  </tr>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { BigNumberInBase, BigNumberInWei, Status } from '@injectivelabs/utils'
import {
  UiDerivativeLimitOrder,
  UiDerivativeMarketWithToken,
  DerivativeOrderSide,
  ZERO_IN_BASE,
  getTokenLogoWithVendorPathPrefix
} from '@injectivelabs/sdk-ui-ts'
import {
  UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS,
  UI_DEFAULT_PRICE_DISPLAY_DECIMALS
} from '~/app/utils/constants'
import { getMarketRoute } from '~/app/utils/market'

export default Vue.extend({
  props: {
    order: {
      required: true,
      type: Object as PropType<UiDerivativeLimitOrder>
    }
  },

  data() {
    return {
      DerivativeOrderSide,
      UI_DEFAULT_PRICE_DISPLAY_DECIMALS,
      UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS,
      status: new Status()
    }
  },

  computed: {
    markets(): UiDerivativeMarketWithToken[] {
      return this.$accessor.derivatives.markets
    },

    market(): UiDerivativeMarketWithToken | undefined {
      const { markets, order } = this

      return markets.find((m) => m.marketId === order.marketId)
    },

    isBinaryOptionsPage(): boolean {
      return this.$route.name === 'binary-options-binaryOption'
    },

    isReduceOnly(): boolean {
      const { margin, order } = this

      if (order.isReduceOnly) {
        return true
      }

      return margin.isZero()
    },

    price(): BigNumberInBase {
      const { market, order } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInWei(order.price).toBase(market.quoteToken.decimals)
    },

    margin(): BigNumberInBase {
      const { market, order } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInWei(order.margin).toBase(market.quoteToken.decimals)
    },

    quantity(): BigNumberInBase {
      const { market, order } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInBase(order.quantity)
    },

    quantityToFormat(): string {
      const { market, quantity } = this

      if (!market) {
        return quantity.toFormat(UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS)
      }

      return quantity.toFormat(market.quantityDecimals)
    },

    unfilledQuantity(): BigNumberInBase {
      const { market, order } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInBase(order.unfilledQuantity)
    },

    filledQuantity(): BigNumberInBase {
      const { unfilledQuantity, quantity } = this

      return quantity.minus(unfilledQuantity)
    },

    leverage(): BigNumberInBase {
      const { quantity, isReduceOnly, margin, price } = this

      if (isReduceOnly) {
        return new BigNumberInBase('')
      }

      return new BigNumberInBase(price.times(quantity).dividedBy(margin))
    },

    filledQuantityPercentage(): BigNumberInBase {
      const { filledQuantity, quantity, market } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      if (filledQuantity.lte(0)) {
        return ZERO_IN_BASE
      }

      return new BigNumberInBase(filledQuantity.dividedBy(quantity).times(100))
    },

    orderFullyFilled(): boolean {
      const { unfilledQuantity } = this

      return unfilledQuantity.isZero()
    },

    orderFillable(): boolean {
      const { unfilledQuantity, quantity } = this

      return unfilledQuantity.lte(quantity)
    },

    total(): BigNumberInBase {
      const { price, quantity } = this

      return price.multipliedBy(quantity)
    },

    orderSideLocalized(): string {
      const { order } = this

      return order.orderSide === DerivativeOrderSide.Buy
        ? this.$t('trade.buy')
        : this.$t('trade.sell')
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
    onCancelOrder(): void {
      this.status.setLoading()

      this.$accessor.derivatives
        .cancelOrder(this.order)
        .then(() => {
          this.$toast.success(this.$t('trade.order_success_canceling'))
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
