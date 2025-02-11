<template>
  <tr>
    <td class="h-8 text-left font-mono">
      <div class="flex items-center gap-4">
        <div v-if="isUserTierLevel" class="bg-primary-500 w-2 h-2 ml-2 rounded-full" />
        <div v-else class="w-2 h-2 ml-2" />
        <span>#{{ index }}</span>
      </div>
    </td>
    <td class="h-8 text-right font-mono">
      &#8805; {{ stakedAmountToFormat }}
      <span class="text-2xs text-gray-500"> INJ </span>
    </td>
    <td class="h-8 text-right font-mono">
      <span class="text-gray-500 uppercase text-2xs tracking-wider">
        {{ $t('and') }}
      </span>
    </td>
    <td class="h-8 text-right font-mono">
      &#8805; {{ volumeToFormat }}
      <span class="text-2xs text-gray-500"> USD </span>
    </td>
    <td class="h-8 text-right font-mono">{{ makerFeeDiscountToFormat }}%</td>
    <td class="h-8 text-right font-mono">{{ takerFeeDiscountToFormat }}%</td>
  </tr>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { BigNumberInBase, BigNumberInWei } from '@injectivelabs/utils'
import { ZERO_IN_BASE } from '@injectivelabs/sdk-ui-ts'
import {
  cosmosSdkDecToBigNumber,
  FeeDiscountAccountInfo,
  FeeDiscountTierInfo
} from '@injectivelabs/sdk-ts'
import { getDecimalsFromNumber } from '~/app/utils/helpers'
import { USDT_DECIMALS } from '~/app/utils/constants'

export default Vue.extend({
  props: {
    tier: {
      required: true,
      type: Object as PropType<FeeDiscountTierInfo>
    },

    index: {
      required: true,
      type: Number
    }
  },

  computed: {
    isUserWalletConnected(): boolean {
      return this.$accessor.wallet.isUserWalletConnected
    },

    feeDiscountAccountInfo(): FeeDiscountAccountInfo | undefined {
      return this.$accessor.exchange.feeDiscountAccountInfo
    },

    isUserTierLevel(): boolean {
      const { feeDiscountAccountInfo, index, isUserWalletConnected } = this

      if (!feeDiscountAccountInfo || !isUserWalletConnected) {
        return false
      }

      return new BigNumberInBase(feeDiscountAccountInfo.tierLevel).eq(index)
    },

    stakedAmount(): BigNumberInBase {
      const { tier } = this

      if (!tier.stakedAmount) {
        return ZERO_IN_BASE
      }

      return new BigNumberInBase(cosmosSdkDecToBigNumber(tier.stakedAmount))
    },

    stakedAmountToFormat(): string {
      const { stakedAmount } = this

      return stakedAmount.toFormat(0)
    },

    volume(): BigNumberInBase {
      const { tier } = this

      if (!tier.volume) {
        return ZERO_IN_BASE
      }

      return new BigNumberInWei(
        cosmosSdkDecToBigNumber(tier.volume)
      ).toBase(USDT_DECIMALS)
    },

    volumeToFormat(): string {
      const { volume } = this

      return volume.toFormat(0)
    },

    makerFeeDiscount(): BigNumberInBase {
      const { tier } = this

      if (!tier.makerDiscountRate) {
        return ZERO_IN_BASE
      }

      return new BigNumberInWei(tier.makerDiscountRate).times(100).toBase()
    },

    makerFeeDiscountToFormat(): string {
      const { makerFeeDiscount } = this

      return makerFeeDiscount.toFormat(
        getDecimalsFromNumber(makerFeeDiscount.toNumber())
      )
    },

    takerFeeDiscount(): BigNumberInBase {
      const { tier } = this

      if (!tier.takerDiscountRate) {
        return ZERO_IN_BASE
      }

      return new BigNumberInWei(tier.takerDiscountRate).times(100).toBase()
    },

    takerFeeDiscountToFormat(): string {
      const { takerFeeDiscount } = this

      return takerFeeDiscount.toFormat(
        getDecimalsFromNumber(takerFeeDiscount.toNumber())
      )
    }
  }
})
</script>
