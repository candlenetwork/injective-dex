<template>
  <div v-if="market" class="w-full flex flex-col gap-6">
    <TradingTypeButtons
      :trading-type.sync="tradingType"
      :trading-type-market="tradingTypeMarket"
      :trading-type-limit="tradingTypeLimit"
      :trading-type-stop-market="tradingTypeStopMarket"
      :trading-type-stop-limit="tradingTypeStopLimit"
      @update:trading-type="handleTradingTypeChange"
    />

    <OrderTypeSelect
      :order-type.sync="orderType"
      v-bind="{ market }"
      @update:order-type="handleOrderTypeChange"
    />

    <OrderInputs
      ref="orderInputs"
      v-bind="{
        averagePriceOption,
        baseAvailableBalance,
        buys,
        executionPrice,
        markPrice,
        hasAmount,
        hasPrice,
        lastTradedPrice,
        makerFeeRate,
        market,
        orderType,
        orderTypeBuy,
        quoteAvailableBalance,
        sells,
        slippageTolerance: form.slippageTolerance,
        takerFeeRate,
        notionalValueWithFees,
        tradingType,
        tradingTypeMarket,
        tradingTypeLimit,
        tradingTypeStopMarket,
        tradingTypeStopLimit,
        isConditionalOrder,
        formId
      }"
      :amount.sync="form.amount"
      :average-price-option.sync="averagePriceOption"
      :has-advanced-settings-errors.sync="hasAdvancedSettingsErrors"
      :has-input-errors.sync="hasInputErrors"
      :post-only.sync="form.postOnly"
      :price.sync="form.price"
      :proportional-percentage.sync="form.proportionalPercentage"
      :quote-amount.sync="form.quoteAmount"
      :slippage-tolerance.sync="form.slippageTolerance"
      @update:priceFromLastTradedPrice="updatePriceFromLastTradedPrice"
      @update:trigger-price="updateTriggerPrice"
    />

    <OrderDetailsWrapper
      v-bind="{
        amount,
        executionPrice,
        feeRate,
        fees,
        market,
        makerFeeRate,
        makerFeeRateDiscount,
        orderType,
        orderTypeBuy,
        postOnly: form.postOnly,
        quoteAmount,
        slippage,
        takerFeeRate,
        takerFeeRateDiscount,
        notionalValue,
        notionalValueWithFees,
        tradingType,
        tradingTypeMarket,
        tradingTypeLimit,
        tradingTypeStopMarket,
        tradingTypeStopLimit
      }"
    />

    <!-- <span class="text-gray-500 text-xs leading-4">
      {{ $t('trade.slippage_cancellation_notice') }}
    </span> -->

    <OrderSubmit
      v-bind="{
        amount: form.amount,
        executionPrice,
        hasAdvancedSettingsErrors,
        hasAmount,
        hasInputErrors,
        hasTriggerPrice,
        isConditionalOrder,
        lastTradedPrice,
        market,
        orderType,
        orderTypeBuy,
        orderTypeToSubmit,
        postOnly: form.postOnly,
        price: form.price,
        slippageTolerance: form.slippageTolerance,
        status,
        tradingType,
        tradingTypeLimit,
        tradingTypeMarket,
        tradingTypeStopLimit,
        tradingTypeStopMarket,
        triggerPriceEqualsMarkPrice
      }"
      @submit="handleSubmit"
      @submit:request="handleRequestSubmit"
    />
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { BigNumberInWei, Status, BigNumberInBase } from '@injectivelabs/utils'
import { TradeExecutionType } from '@injectivelabs/ts-types'
import {
  ZERO_IN_BASE,
  UiPriceLevel,
  UiSpotMarketWithToken,
  UiSpotOrderbook,
  UiSubaccount,
  SpotOrderSide
} from '@injectivelabs/sdk-ui-ts'
import {
  cosmosSdkDecToBigNumber,
  FeeDiscountAccountInfo
} from '@injectivelabs/sdk-ts'
import OrderDetailsWrapper from '~/components/partials/common/trade/order-details-wrapper.vue'
import OrderSubmit from '~/components/partials/common/trade/order-submit.vue'
import OrderInputs from '~/components/partials/common/trade/order-inputs.vue'
import OrderTypeSelect from '~/components/partials/common/trade/order-type-select.vue'
import {
  AveragePriceOptions,
  Modal,
  OrderAttemptStatus,
  TradeConfirmationModalData
} from '~/types'
import {
  calculateAverageExecutionPriceFromFillableNotionalOnOrderBook,
  calculateAverageExecutionPriceFromOrderbook,
  calculateWorstExecutionPriceFromOrderbook
} from '~/app/client/utils/spot'
import TradingTypeButtons from '~/components/partials/common/trade/trading-type-buttons.vue'
import {
  BIGGER_PRICE_WARNING_DEVIATION,
  DEFAULT_PRICE_WARNING_DEVIATION
} from '~/app/utils/constants'
import { excludedPriceDeviationSlugs } from '~/app/data/market'
import { localStorage } from '~/app/Services'
import { amplitudeTracker } from '~/app/providers/AmplitudeTracker'

interface TradeForm {
  amount: string
  quoteAmount: string
  price: string
  triggerPrice: string
  slippageTolerance: string
  postOnly: boolean
  proportionalPercentage: number
  formId: number
}

const initialForm = (formId: number): TradeForm => ({
  amount: '',
  quoteAmount: '',
  price: '',
  triggerPrice: '',
  slippageTolerance: '0.5',
  postOnly: false,
  proportionalPercentage: 0,
  formId
})

export default Vue.extend({
  components: {
    TradingTypeButtons,
    OrderTypeSelect,
    OrderInputs,
    OrderSubmit,
    OrderDetailsWrapper
  },

  data() {
    return {
      TradeExecutionType,
      SpotOrderSide,
      tradingType: TradeExecutionType.LimitFill,
      orderType: SpotOrderSide.Buy,
      status: new Status(),
      form: initialForm(0),
      hasInputErrors: false,
      hasAdvancedSettingsErrors: false,
      averagePriceOption: AveragePriceOptions.None
    }
  },

  computed: {
    market(): UiSpotMarketWithToken | undefined {
      return this.$accessor.spot.market
    },

    orderbook(): UiSpotOrderbook | undefined {
      return this.$accessor.spot.orderbook
    },

    subaccount(): UiSubaccount | undefined {
      return this.$accessor.account.subaccount
    },

    lastTradedPrice(): BigNumberInBase {
      return this.$accessor.spot.lastTradedPrice
    },

    feeDiscountAccountInfo(): FeeDiscountAccountInfo | undefined {
      return this.$accessor.exchange.feeDiscountAccountInfo
    },

    tierLevel(): number {
      const { feeDiscountAccountInfo } = this

      if (!feeDiscountAccountInfo) {
        return 0
      }

      return new BigNumberInBase(
        feeDiscountAccountInfo.tierLevel || 0
      ).toNumber()
    },

    isConditionalOrder(): boolean {
      const { tradingTypeStopMarket, tradingTypeStopLimit } = this

      return tradingTypeStopMarket || tradingTypeStopLimit
    },

    buys(): UiPriceLevel[] {
      const { orderbook } = this

      if (!orderbook) {
        return []
      }

      return orderbook.buys
    },

    sells(): UiPriceLevel[] {
      const { orderbook } = this

      if (!orderbook) {
        return []
      }

      return orderbook.sells
    },

    tradingTypeMarket(): boolean {
      const { tradingType } = this

      return tradingType === TradeExecutionType.Market
    },

    tradingTypeLimit(): boolean {
      const { tradingType } = this

      return tradingType === TradeExecutionType.LimitFill
    },

    tradingTypeStopLimit(): boolean {
      const { tradingType } = this

      // TODO: Replace with enum from BE once available.
      return tradingType.toString() === 'stopLimit'
    },

    tradingTypeStopMarket(): boolean {
      const { tradingType } = this

      // TODO: Replace with enum from BE once available.
      return tradingType.toString() === 'stopMarket'
    },

    orderTypeBuy(): boolean {
      const { orderType } = this

      return orderType === SpotOrderSide.Buy
    },

    orderTypeToSubmit(): SpotOrderSide {
      const {
        form: { postOnly },
        orderTypeBuy
      } = this

      switch (true) {
        case postOnly && orderTypeBuy: {
          return SpotOrderSide.BuyPO
        }
        case orderTypeBuy: {
          return SpotOrderSide.Buy
        }
        case postOnly && !orderTypeBuy: {
          return SpotOrderSide.SellPO
        }
        case !orderTypeBuy: {
          return SpotOrderSide.Sell
        }
        default: {
          return SpotOrderSide.Buy
        }
      }
    },

    amount(): BigNumberInBase {
      const {
        form: { amount }
      } = this

      return amount ? new BigNumberInBase(amount) : ZERO_IN_BASE
    },

    quoteAmount(): BigNumberInBase {
      const {
        form: { quoteAmount }
      } = this

      return quoteAmount ? new BigNumberInBase(quoteAmount) : ZERO_IN_BASE
    },

    hasAmount(): boolean {
      const { amount } = this

      return amount.gt('0')
    },

    baseAvailableBalance(): BigNumberInBase {
      const { subaccount, market } = this

      if (!subaccount || !market) {
        return ZERO_IN_BASE
      }

      const balance = subaccount.balances.find(
        (balance) =>
          balance.denom.toLowerCase() === market.baseDenom.toLowerCase()
      )

      if (!balance) {
        return ZERO_IN_BASE
      }

      const baseAvailableBalance = new BigNumberInWei(
        balance.availableBalance || 0
      ).toBase(market.baseToken.decimals)

      if (baseAvailableBalance.isNaN()) {
        return ZERO_IN_BASE
      }

      return baseAvailableBalance
    },

    quoteAvailableBalance(): BigNumberInBase {
      const { subaccount, market } = this

      if (!subaccount || !market) {
        return ZERO_IN_BASE
      }

      const balance = subaccount.balances.find(
        (balance) =>
          balance.denom.toLowerCase() === market.quoteDenom.toLowerCase()
      )

      if (!balance) {
        return ZERO_IN_BASE
      }

      const quoteAvailableBalance = new BigNumberInWei(
        balance.availableBalance || 0
      ).toBase(market.quoteToken.decimals)

      if (quoteAvailableBalance.isNaN()) {
        return ZERO_IN_BASE
      }

      return quoteAvailableBalance
    },

    slippage(): BigNumberInBase {
      const {
        orderTypeBuy,
        form: { slippageTolerance }
      } = this

      const slippageAsBigNumber = new BigNumberInBase(slippageTolerance || 0)

      return new BigNumberInBase(
        orderTypeBuy
          ? slippageAsBigNumber.div(100).plus(1)
          : slippageAsBigNumber.div(100).minus(1).times(-1)
      )
    },

    makerFeeRateDiscount(): BigNumberInBase {
      const { feeDiscountAccountInfo } = this

      if (!feeDiscountAccountInfo) {
        return ZERO_IN_BASE
      }

      if (!feeDiscountAccountInfo.accountInfo) {
        return ZERO_IN_BASE
      }

      const discount = cosmosSdkDecToBigNumber(
        feeDiscountAccountInfo.accountInfo.makerDiscountRate
      )

      return new BigNumberInBase(discount)
    },

    takerFeeRateDiscount(): BigNumberInBase {
      const { feeDiscountAccountInfo } = this

      if (!feeDiscountAccountInfo) {
        return ZERO_IN_BASE
      }

      if (!feeDiscountAccountInfo.accountInfo) {
        return ZERO_IN_BASE
      }

      const discount = cosmosSdkDecToBigNumber(
        feeDiscountAccountInfo.accountInfo.takerDiscountRate
      )

      return new BigNumberInBase(discount)
    },

    makerFeeRate(): BigNumberInBase {
      const { market, makerFeeRateDiscount } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      const makerFeeRate = new BigNumberInBase(market.makerFeeRate)

      if (makerFeeRate.lte(0)) {
        return makerFeeRate
      }

      return new BigNumberInBase(market.makerFeeRate).times(
        new BigNumberInBase(1).minus(makerFeeRateDiscount)
      )
    },

    takerFeeRate(): BigNumberInBase {
      const { market, takerFeeRateDiscount } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      return new BigNumberInBase(market.takerFeeRate).times(
        new BigNumberInBase(1).minus(takerFeeRateDiscount)
      )
    },

    feeRate(): BigNumberInBase {
      const {
        form: { postOnly },
        takerFeeRate,
        makerFeeRate,
        tradingTypeMarket
      } = this

      if (postOnly && !tradingTypeMarket) {
        return makerFeeRate
      }

      return takerFeeRate
    },

    price(): BigNumberInBase {
      const {
        form: { price }
      } = this

      return price ? new BigNumberInBase(this.form.price) : ZERO_IN_BASE
    },

    triggerPrice(): BigNumberInBase {
      return new BigNumberInBase(this.form.triggerPrice)
    },

    markPrice(): BigNumberInBase {
      return new BigNumberInBase(this.$accessor.derivatives.marketMarkPrice)
    },

    hasPrice(): boolean {
      const { executionPrice } = this

      return executionPrice.gt('0')
    },

    hasTriggerPrice(): boolean {
      const { triggerPrice } = this

      return triggerPrice !== undefined
    },

    triggerPriceEqualsMarkPrice(): boolean {
      const { triggerPrice, markPrice } = this

      if (!triggerPrice) {
        return false
      }

      return triggerPrice.eq(markPrice)
    },

    averagePriceDerivedFromBaseAmount(): BigNumberInBase {
      const {
        orderTypeBuy,
        sells,
        buys,
        hasAmount,
        market,
        amount,
        averagePriceOption,
        baseAvailableBalance,
        form: { proportionalPercentage }
      } = this

      if (!market || !hasAmount) {
        return ZERO_IN_BASE
      }

      const percentBaseBalance = baseAvailableBalance.times(
        proportionalPercentage
      )

      return calculateAverageExecutionPriceFromOrderbook({
        records: orderTypeBuy ? sells : buys,
        amount:
          averagePriceOption === AveragePriceOptions.BaseAmount
            ? amount
            : percentBaseBalance,
        market
      })
    },

    averagePriceDerivedFromQuoteAmount(): BigNumberInBase {
      const {
        orderTypeBuy,
        sells,
        buys,
        market,
        quoteAmount,
        averagePriceOption,
        quoteAvailableBalance,
        form: { proportionalPercentage }
      } = this

      if (!market) {
        return ZERO_IN_BASE
      }

      const percentQuoteBalance = quoteAvailableBalance.times(
        proportionalPercentage
      )

      const quoteAmountForAveragePrice =
        averagePriceOption === AveragePriceOptions.QuoteAmount
          ? quoteAmount
          : percentQuoteBalance

      const averagePrice =
        calculateAverageExecutionPriceFromFillableNotionalOnOrderBook({
          records: orderTypeBuy ? sells : buys,
          quoteAmount: quoteAmountForAveragePrice,
          market
        })

      if (averagePrice.isNaN()) {
        return ZERO_IN_BASE
      }

      return averagePrice
    },

    averagePrice(): BigNumberInBase {
      const {
        averagePriceDerivedFromBaseAmount,
        averagePriceDerivedFromQuoteAmount,
        averagePriceOption,
        orderTypeBuy
      } = this

      if (averagePriceOption === AveragePriceOptions.BaseAmount) {
        return averagePriceDerivedFromBaseAmount
      }

      if (averagePriceOption === AveragePriceOptions.QuoteAmount) {
        return averagePriceDerivedFromQuoteAmount
      }

      if (averagePriceOption === AveragePriceOptions.Percentage) {
        if (orderTypeBuy) {
          return averagePriceDerivedFromQuoteAmount
        }

        return averagePriceDerivedFromBaseAmount
      }

      return ZERO_IN_BASE
    },

    executionPrice(): BigNumberInBase {
      const { tradingTypeMarket, averagePrice, price } = this

      return tradingTypeMarket ? averagePrice : price
    },

    worstPrice(): BigNumberInBase {
      const { orderTypeBuy, slippage, sells, buys, hasAmount, market, amount } =
        this

      if (!market || !hasAmount) {
        return ZERO_IN_BASE
      }

      const records = orderTypeBuy ? sells : buys

      const worstPrice = calculateWorstExecutionPriceFromOrderbook({
        records,
        amount,
        market
      })

      return new BigNumberInBase(
        worstPrice.times(slippage).toFixed(market.priceDecimals)
      )
    },

    notionalValue(): BigNumberInBase {
      const { hasPrice, hasAmount, executionPrice, market, amount } = this

      if (!hasPrice || !hasAmount || !market) {
        return ZERO_IN_BASE
      }

      return executionPrice.times(amount)
    },

    fees(): BigNumberInBase {
      const { notionalValue, feeRate, market } = this

      if (notionalValue.isNaN() || !market) {
        return ZERO_IN_BASE
      }

      return notionalValue.times(feeRate)
    },

    notionalValueWithFees(): BigNumberInBase {
      const { fees, notionalValue, market } = this

      if (notionalValue.isNaN() || notionalValue.lte(0) || !market) {
        return ZERO_IN_BASE
      }

      return fees.plus(notionalValue)
    },

    $orderInputs(): any {
      return this.$refs.orderInputs
    },

    priceHasHighDeviationWarning(): boolean {
      const {
        executionPrice,
        orderTypeBuy,
        tradingTypeMarket,
        market,
        lastTradedPrice
      } = this

      if (!market || tradingTypeMarket || executionPrice.lte(0)) {
        return false
      }

      const defaultPriceWarningDeviation = excludedPriceDeviationSlugs.includes(
        market.ticker
      )
        ? BIGGER_PRICE_WARNING_DEVIATION
        : DEFAULT_PRICE_WARNING_DEVIATION

      const deviation = new BigNumberInBase(1)
        .minus(
          orderTypeBuy
            ? lastTradedPrice.dividedBy(executionPrice)
            : executionPrice.dividedBy(lastTradedPrice)
        )
        .times(100)

      return deviation.gt(defaultPriceWarningDeviation)
    },

    formId(): number {
      return this.form.formId
    }
  },

  mounted() {
    this.$root.$on('orderbook-price-click', this.onOrderbookPriceClick)
    this.$root.$on('orderbook-size-click', this.onOrderbookSizeClick)
    this.$root.$on('orderbook-notional-click', this.onOrderbookNotionalClick)
  },

  methods: {
    handleTradingTypeChange() {
      this.resetForm()
    },

    handleOrderTypeChange() {
      //
    },

    updatePriceFromLastTradedPrice() {
      const { lastTradedPrice, market } = this

      if (!market) {
        return
      }

      this.form.price = lastTradedPrice.toFixed(
        market.priceDecimals,
        BigNumberInBase.ROUND_HALF_UP
      )
    },

    updateTriggerPrice(triggerPrice: string) {
      this.form.triggerPrice = triggerPrice
    },

    onOrderbookNotionalClick({
      total,
      price,
      type
    }: {
      total: BigNumberInBase
      price: BigNumberInBase
      type: SpotOrderSide
    }) {
      const { market, slippage } = this

      if (!market) {
        return
      }

      this.tradingType = TradeExecutionType.Market
      this.orderType =
        type === SpotOrderSide.Buy ? SpotOrderSide.Sell : SpotOrderSide.Buy

      const amount = total
        .dividedBy(price.times(slippage).toFixed(market.priceDecimals))
        .toFixed(market.quantityDecimals, BigNumberInBase.ROUND_DOWN)

      this.$nextTick(() => {
        this.$orderInputs.onAmountChange(amount)
      })
    },

    onOrderbookSizeClick(size: string) {
      if (this.$orderInputs) {
        this.$orderInputs.onAmountChange(size)
      }
    },

    onOrderbookPriceClick(price: string) {
      const { tradingType } = this

      if (tradingType === TradeExecutionType.Market) {
        return
      }

      this.$nextTick(() => {
        this.$orderInputs.onPriceChange(price)
      })
    },

    resetForm() {
      this.$set(this, 'form', initialForm(this.form.formId + 1))

      this.form.amount = ''
      this.form.quoteAmount = ''
      this.form.price = ''
      this.form.triggerPrice = ''
      this.form.slippageTolerance = '0.5'
      this.form.postOnly = false
      this.form.proportionalPercentage = 0
    },

    submitLimitOrder() {
      const { orderTypeToSubmit, market, price, amount } = this

      if (!market) {
        return
      }

      this.status.setLoading()

      this.$accessor.spot
        .submitLimitOrder({
          price,
          quantity: amount,
          orderType: orderTypeToSubmit
        })
        .then(() => {
          this.handleAttemptPlaceOrderTrack()
          this.$toast.success(this.$t('trade.order_placed'))
          this.resetForm()
        })
        .catch((e) => {
          this.handleAttemptPlaceOrderTrack(e)
          this.$onRejected(e)
        })
        .finally(() => {
          this.status.setIdle()
        })
    },

    submitStopLimitOrder() {
      const { orderTypeToSubmit, market, price, triggerPrice, amount } = this

      if (!market) {
        return
      }

      this.status.setLoading()

      this.$accessor.spot
        .submitStopLimitOrder({
          price,
          triggerPrice,
          quantity: amount,
          orderType: orderTypeToSubmit
        })
        .then(() => {
          this.handleAttemptPlaceOrderTrack()
          this.$toast.success(this.$t('trade.order_placed'))
          this.resetForm()
        })
        .catch((e) => {
          this.handleAttemptPlaceOrderTrack(e)
          this.$onRejected(e)
        })
        .finally(() => {
          this.status.setIdle()
        })
    },

    submitMarketOrder() {
      const { orderType, market, worstPrice, amount } = this

      if (!market) {
        return
      }

      this.status.setLoading()

      this.$accessor.spot
        .submitMarketOrder({
          quantity: amount,
          price: worstPrice,
          orderType
        })
        .then(() => {
          this.handleAttemptPlaceOrderTrack()
          this.$toast.success(this.$t('trade.trade_placed'))
          this.resetForm()
        })
        .catch((e) => {
          this.handleAttemptPlaceOrderTrack(e)
          this.$onRejected(e)
        })
        .finally(() => {
          this.status.setIdle()
        })
    },

    submitStopMarketOrder() {
      const { orderType, market, worstPrice, triggerPrice, amount } = this

      if (!market) {
        return
      }

      this.status.setLoading()

      this.$accessor.spot
        .submitStopMarketOrder({
          quantity: amount,
          price: worstPrice,
          triggerPrice,
          orderType
        })
        .then(() => {
          this.handleAttemptPlaceOrderTrack()
          this.$toast.success(this.$t('trade.trade_placed'))
          this.resetForm()
        })
        .catch((e) => {
          this.handleAttemptPlaceOrderTrack(e)
          this.$onRejected(e)
        })
        .finally(() => {
          this.status.setIdle()
        })
    },

    handleRequestSubmit() {
      const {
        price,
        amount,
        market,
        tradingType,
        triggerPrice,
        tradingTypeLimit,
        tradingTypeMarket,
        isConditionalOrder,
        tradingTypeStopLimit,
        priceHasHighDeviationWarning,
        orderType
      } = this

      if (!isConditionalOrder && priceHasHighDeviationWarning) {
        return this.$accessor.modal.openModal({
          type: Modal.OrderConfirm
        })
      }

      const shouldSkipTradeConfirmationModal =
        localStorage.get('skipTradeConfirmationModal') === true

      if (
        shouldSkipTradeConfirmationModal ||
        tradingTypeMarket ||
        tradingTypeLimit
      ) {
        return this.handleSubmit()
      }

      if (!triggerPrice || !market || (tradingTypeStopLimit && !price)) {
        return
      }

      const modalData: TradeConfirmationModalData = {
        tradingType,
        orderType,
        triggerPrice,
        triggerPriceSymbol: market.quoteToken.symbol,
        amount,
        amountSymbol: market.baseToken.symbol
      }

      if (tradingTypeStopLimit) {
        modalData.price = price
        modalData.priceSymbol = market.quoteToken.symbol
      }

      return this.$accessor.modal.openModal({
        type: Modal.OrderConfirm,
        data: modalData
      })
    },

    handleSubmit() {
      const { tradingType } = this

      switch (tradingType.toString()) {
        case TradeExecutionType.Market.toString():
          return this.submitMarketOrder()
        case TradeExecutionType.LimitFill.toString():
          return this.submitLimitOrder()
        case 'stopLimit':
          return this.submitStopLimitOrder()
        case 'stopMarket':
          return this.submitStopMarketOrder()
      }
    },

    handleAttemptPlaceOrderTrack(errorMessage?: string) {
      const {
        market,
        tradingTypeMarket,
        form,
        tradingTypeLimit,
        tradingType,
        orderType
      } = this

      if (!market) {
        return
      }

      const slippageTolerance = tradingTypeMarket ? form.slippageTolerance : ''
      const postOnly = tradingTypeLimit && form.postOnly
      const status = errorMessage
        ? OrderAttemptStatus.Error
        : OrderAttemptStatus.Success

      amplitudeTracker.submitAttemptPlaceOrderTrackEvent({
        status,
        postOnly,
        orderType,
        tradingType,
        slippageTolerance,
        amount: form.amount,
        market: market.slug,
        marketType: market.subType,
        limitPrice: form.price,
        error: errorMessage
      })
    }
  }
})
</script>
