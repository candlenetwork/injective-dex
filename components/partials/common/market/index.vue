<template>
  <div
    class="bg-helixGray-950 shadow-sm px-4 py-1 rounded-xl h-full"
    data-cy="trading-page-market-info-component"
  >
    <div
      class="flex justify-between items-center flex-wrap lg:flex-nowrap gap-4 h-full"
    >
      <div class="flex justify-between items-center w-full lg:w-auto gap-2">
        <div class="flex items-center" @click="handleTokenClick">
          <img
            :src="baseTokenLogo"
            :alt="market.baseToken.name"
            class="w-6 h-6 mr-4"
          />
          <div class="leading-none select-none">
            <p class="text-gray-100 font-semibold text-sm flex items-center">
              <span
                data-cy="trading-page-ticker-name-text-content"
                class="whitespace-nowrap overflow-ellipsis overflow-hidden"
              >
                {{ market.ticker }}
              </span>

              <IconChevron
                class="w-auto h-3 text-gray-500 ml-2 transform transition ease-in-out duration-300"
                :class="[expanded ? 'rotate-90' : '-rotate-90']"
              />
            </p>
            <p class="text-gray-500 text-xs">
              {{ market.baseToken.name }}
            </p>
          </div>
        </div>

        <div class="w-px h-8 border-r hidden lg:block" />

        <LastTradedPriceAndChange
          :market="market"
          :summary="summary"
          lg
          update-tab
        />
      </div>

      <MarketStats
        :market="market"
        :summary="summary"
        class="w-full lg:w-auto pb-4 lg:pb-0"
      />

      <div class="ml-auto hidden lg:block">
        <button
          id="layout-preferences-button"
          class="w-6 h-6 cursor-pointer group flex justify-center items-center"
          @mouseenter="showLayoutPreferences"
        >
          <IconSliders class="text-gray-450 group-hover:text-white w-4 h-4" />
        </button>
      </div>
    </div>

    <PopperBox
      ref="layout-preferences-dropdown"
      class="popper rounded-lg flex flex-col flex-wrap text-xs absolute w-80 bg-gray-950 shadow-dropdown z-1100"
      :options="popperOptions"
      :hide-arrow="true"
      binding-element="#layout-preferences-button"
    >
      <LayoutPreferences />
    </PopperBox>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import {
  getTokenLogoWithVendorPathPrefix,
  UiDerivativeMarketSummary,
  UiDerivativeMarketWithToken,
  UiSpotMarketSummary
} from '@injectivelabs/sdk-ui-ts'
import MarketStats from './stats.vue'
import LastTradedPriceAndChange from './last-traded-price-and-change.vue'
import LayoutPreferences from './layout-preferences.vue'
import PopperBox from '~/components/elements/popper-box.vue'

export default Vue.extend({
  components: {
    LastTradedPriceAndChange,
    MarketStats,
    LayoutPreferences,
    PopperBox
  },

  props: {
    market: {
      type: Object as PropType<UiDerivativeMarketWithToken>,
      required: true
    },

    summary: {
      type: Object as PropType<UiSpotMarketSummary | UiDerivativeMarketSummary>,
      required: true
    },

    expanded: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    baseTokenLogo(): string {
      const { market } = this

      if (!market) {
        return ''
      }

      if (!market.baseToken) {
        return ''
      }

      return getTokenLogoWithVendorPathPrefix(market.baseToken.logo)
    },

    $popper(): any {
      return this.$refs['layout-preferences-dropdown']
    },

    popperOptions(): any {
      return {
        placement: 'bottom-end',
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, 0]
            }
          }
        ]
      }
    }
  },

  methods: {
    handleTokenClick() {
      this.$root.$emit('toggle-market-list')
    },

    showLayoutPreferences() {
      const { $popper } = this

      if ($popper) {
        $popper.showDropdown()
      }
    }
  }
})
</script>
