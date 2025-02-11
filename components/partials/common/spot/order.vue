<template>
  <tr v-if="market" :data-cy="'spot-order-table-row-' + market.ticker">
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
            data-cy="spot-order-ticker-name-table-data"
          >
            {{ market.ticker }}
          </span>
        </div>
      </div>
    </td>

    <td class="h-12 text-left">
      <span
        class="text-xs"
        data-cy="spot-order-order-side-table-data"
        :class="{
          'text-green-500': orderTypeBuy,
          'text-red-500': !orderTypeBuy
        }"
      >
        {{ orderSideLocalized }}
      </span>
    </td>

    <td class="h-12 font-mono text-right">
      <VNumber
        xs
        data-cy="spot-order-price-table-data"
        :decimals="
          market ? market.priceDecimals : UI_DEFAULT_PRICE_DISPLAY_DECIMALS
        "
        :number="price"
      />
    </td>
    <td class="h-12 text-right font-mono">
      <VNumber
        xs
        data-cy="spot-order-quantity-table-data"
        :decimals="
          market ? market.quantityDecimals : UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS
        "
        :number="quantity"
      />
    </td>
    <td class="h-12 text-right font-mono">
      <VNumber
        xs
        data-cy="spot-order-unfilled-quantity-table-data"
        :decimals="
          market ? market.quantityDecimals : UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS
        "
        :number="unfilledQuantity"
      />
    </td>
    <td class="h-12">
      <div class="flex items-center justify-end">
        <VNumber
          xs
          data-cy="spot-order-filled-quantity-table-data"
          :decimals="
            market
              ? market.quantityDecimals
              : UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS
          "
          :number="filledQuantity"
        />
        <span v-if="filledQuantity.gt('0')" class="ml-1 text-xs">
          ({{ filledQuantityPercentageToFormat }}%)
        </span>
      </div>
    </td>
    <td class="h-12 font-mono text-right">
      <VNumber
        xs
        data-cy="spot-order-total-table-data"
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
    <td class="h-12 relative">
      <div class="flex items-center justify-end">
        <span
          v-if="false"
          class="cursor-pointer text-primary-500 mr-6"
          @click="handleClickOnMarket"
        >
          {{ $t('common.view') }}
        </span>
        <VButton
          v-if="orderFillable"
          :status="status"
          class="rounded w-6 h-6"
          data-cy="spot-order-cancel-link"
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
import {
  BigNumberInBase,
  BigNumberInWei,
  Status,
  StatusType
} from '@injectivelabs/utils'
import {
  getTokenLogoWithVendorPathPrefix,
  SpotOrderSide,
  UiSpotLimitOrder,
  UiSpotMarketWithToken,
  ZERO_IN_BASE
} from '@injectivelabs/sdk-ui-ts'
import {
  UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS,
  UI_DEFAULT_PRICE_DISPLAY_DECIMALS
} from '~/app/utils/constants'

export default Vue.extend({
  props: {
    order: {
      required: true,
      type: Object as PropType<UiSpotLimitOrder>
    }
  },

  data() {
    return {
      UI_DEFAULT_AMOUNT_DISPLAY_DECIMALS,
      UI_DEFAULT_PRICE_DISPLAY_DECIMALS,
      SpotOrderSide,
      status: new Status(),
      statusTest: new Status(StatusType.Loading)
    }
  },

  computed: {
    currentMarket(): UiSpotMarketWithToken | undefined {
      return this.$accessor.spot.market
    },

    markets(): UiSpotMarketWithToken[] {
      return this.$accessor.spot.markets
    },

    market(): UiSpotMarketWithToken | undefined {
      const { markets, order } = this

      return markets.find((m) => m.marketId === order.marketId)
    },

    orderTypeBuy(): boolean {
      const { order } = this

      return order.orderSide === SpotOrderSide.Buy
    },

    price(): BigNumberInBase {
      const { market, order } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInBase(
        new BigNumberInBase(order.price).toWei(
          market.baseToken.decimals - market.quoteToken.decimals
        )
      )
    },

    quantity(): BigNumberInBase {
      const { market, order } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInWei(order.quantity).toBase(
        market.baseToken.decimals
      )
    },

    unfilledQuantity(): BigNumberInBase {
      const { market, order } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInWei(order.unfilledQuantity).toBase(
        market.baseToken.decimals
      )
    },

    filledQuantity(): BigNumberInBase {
      const { unfilledQuantity, quantity } = this

      return quantity.minus(unfilledQuantity)
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

    filledQuantityPercentageToFormat(): string {
      const { filledQuantityPercentage } = this

      return filledQuantityPercentage.toFormat(2)
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

      return quantity.multipliedBy(price)
    },

    orderSideLocalized(): string {
      const { order } = this

      return order.orderSide === SpotOrderSide.Buy
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

      this.$accessor.spot
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

      return this.$router.push({
        name: 'spot-spot',
        params: {
          marketId: market.marketId,
          spot: market.slug
        }
      })
    }
  }
})
</script>
