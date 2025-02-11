import { actionTree, getterTree } from 'typed-vuex'
import {
  UiDerivativeMarketSummary,
  UiDerivativeMarketWithToken,
  UiMarketHistory,
  UiMarketsHistoryTransformer,
  UiSpotMarketSummary,
  UiSpotMarketWithToken,
  zeroSpotMarketSummary,
  ZERO_IN_BASE
} from '@injectivelabs/sdk-ui-ts'
import {
  ExchangeParams,
  FeeDiscountAccountInfo,
  FeeDiscountSchedule
} from '@injectivelabs/sdk-ts'
import { Token } from '@injectivelabs/token-metadata'
import {
  exchangeApi,
  indexerRestMarketChronosApi,
  tokenService
} from '~/app/Services'
import { upcomingMarkets, deprecatedMarkets } from '~/app/data/market'
import { TradingRewardsCampaign } from '~/app/client/types/exchange'

const initialStateFactory = () => ({
  params: undefined as ExchangeParams | undefined,
  feeDiscountSchedule: undefined as FeeDiscountSchedule | undefined,
  feeDiscountAccountInfo: undefined as FeeDiscountAccountInfo | undefined,
  tradingRewardsCampaign: undefined as TradingRewardsCampaign | undefined,
  tradeRewardsPoints: [] as string[],
  pendingTradeRewardsPoints: [] as string[],

  upcomingMarkets: upcomingMarkets as Array<
    UiSpotMarketWithToken | UiDerivativeMarketWithToken
  >,
  upcomingMarketsSummaries: upcomingMarkets.map((m) =>
    zeroSpotMarketSummary(m.marketId)
  ) as Array<UiSpotMarketSummary | UiDerivativeMarketSummary>,

  deprecatedMarkets: deprecatedMarkets as Array<
    UiSpotMarketWithToken | UiDerivativeMarketWithToken
  >,
  deprecatedMarketsSummaries: deprecatedMarkets.map((m) =>
    zeroSpotMarketSummary(m.marketId)
  ) as Array<UiSpotMarketSummary | UiDerivativeMarketSummary>,
  marketsHistory: [] as UiMarketHistory[]
})

const initialState = initialStateFactory()

export const state = () => ({
  params: initialState.params as ExchangeParams | undefined,
  feeDiscountSchedule: initialState.feeDiscountSchedule as
    | FeeDiscountSchedule
    | undefined,
  feeDiscountAccountInfo: initialState.feeDiscountAccountInfo as
    | FeeDiscountAccountInfo
    | undefined,
  tradingRewardsCampaign: initialState.tradingRewardsCampaign as
    | TradingRewardsCampaign
    | undefined,
  tradeRewardsPoints: initialState.tradeRewardsPoints as string[],
  pendingTradeRewardsPoints: initialState.pendingTradeRewardsPoints as string[],

  upcomingMarkets: initialState.upcomingMarkets as Array<
    UiSpotMarketWithToken | UiDerivativeMarketWithToken
  >,
  upcomingMarketsSummaries: initialState.upcomingMarketsSummaries as Array<
    UiSpotMarketSummary | UiDerivativeMarketSummary
  >,

  deprecatedMarkets: initialState.deprecatedMarkets as Array<
    UiSpotMarketWithToken | UiDerivativeMarketWithToken
  >,
  deprecatedMarketsSummaries: initialState.deprecatedMarketsSummaries as Array<
    UiSpotMarketSummary | UiDerivativeMarketSummary
  >,
  marketsHistory: initialState.marketsHistory as UiMarketHistory[]
})

export type ExchangeStoreState = ReturnType<typeof state>

export const getters = getterTree(state, {
  //
})

export const mutations = {
  setParams(state: ExchangeStoreState, params: ExchangeParams) {
    state.params = params
  },

  setFeeDiscountSchedule(
    state: ExchangeStoreState,
    feeDiscountSchedule: FeeDiscountSchedule
  ) {
    state.feeDiscountSchedule = feeDiscountSchedule
  },

  setTradingRewardsCampaign(
    state: ExchangeStoreState,
    tradingRewardsCampaign: TradingRewardsCampaign
  ) {
    state.tradingRewardsCampaign = tradingRewardsCampaign
  },

  setFeeDiscountAccountInfo(
    state: ExchangeStoreState,
    feeDiscountAccountInfo: FeeDiscountAccountInfo
  ) {
    state.feeDiscountAccountInfo = feeDiscountAccountInfo
  },

  setTradeRewardPoints(
    state: ExchangeStoreState,
    tradeRewardsPoints: string[]
  ) {
    state.tradeRewardsPoints = tradeRewardsPoints
  },

  setPendingTradeRewardPoints(
    state: ExchangeStoreState,
    tradeRewardsPoints: string[]
  ) {
    state.pendingTradeRewardsPoints = tradeRewardsPoints
  },

  setMarketsHistory(
    state: ExchangeStoreState,
    marketsHistory: UiMarketHistory[]
  ) {
    state.marketsHistory = [...state.marketsHistory, ...marketsHistory]
  },

  reset(state: ExchangeStoreState) {
    const initialState = initialStateFactory()

    state.feeDiscountSchedule = initialState.feeDiscountSchedule
    state.feeDiscountAccountInfo = initialState.feeDiscountAccountInfo
    state.tradingRewardsCampaign = initialState.tradingRewardsCampaign
    state.tradeRewardsPoints = initialState.tradeRewardsPoints
    state.pendingTradeRewardsPoints = initialState.pendingTradeRewardsPoints
  }
}

export const actions = actionTree(
  { state, mutations },
  {
    async initFeeDiscounts(_) {
      await this.app.$accessor.exchange.fetchFeeDiscountAccountInfo()
    },

    async initTradeAndEarn(_) {
      await this.app.$accessor.exchange.fetchTradeRewardPoints()
      await this.app.$accessor.exchange.fetchPendingTradeRewardPoints()
    },

    async fetchParams({ commit }) {
      const params = await exchangeApi.fetchModuleParams()

      commit('setParams', params)
    },

    async fetchFeeDiscountSchedule({ commit }) {
      const feeDiscountSchedule = await exchangeApi.fetchFeeDiscountSchedule()

      if (feeDiscountSchedule) {
        const quoteTokenMeta = (await Promise.all(
          feeDiscountSchedule.quoteDenomsList.map(
            async (denom) => await tokenService.getDenomToken(denom)
          )
        )) as Token[]

        const feeDiscountScheduleWithToken = {
          ...feeDiscountSchedule,
          quoteTokenMeta
        } as FeeDiscountSchedule

        commit('setFeeDiscountSchedule', feeDiscountScheduleWithToken)
      }
    },

    async fetchFeeDiscountAccountInfo({ commit }) {
      const { isUserWalletConnected, injectiveAddress } =
        this.app.$accessor.wallet

      if (!isUserWalletConnected || !injectiveAddress) {
        return
      }

      const feeDiscountAccountInfo =
        await exchangeApi.fetchFeeDiscountAccountInfo(injectiveAddress)

      if (feeDiscountAccountInfo) {
        commit('setFeeDiscountAccountInfo', feeDiscountAccountInfo)
      }
    },

    async fetchTradingRewardsCampaign({ commit }) {
      const tradingRewardsCampaign =
        await exchangeApi.fetchTradingRewardsCampaign()

      if (tradingRewardsCampaign) {
        const quoteDenomsList = tradingRewardsCampaign.tradingRewardCampaignInfo
          ? tradingRewardsCampaign.tradingRewardCampaignInfo.quoteDenomsList
          : []
        const quoteSymbolsList = (
          (
            await Promise.all(
              quoteDenomsList.map(
                async (denom) => await tokenService.getDenomToken(denom)
              )
            )
          ).filter((token) => token) as Token[]
        ).map((token) => token.symbol)

        const tradingRewardCampaignInfo = {
          ...tradingRewardsCampaign.tradingRewardCampaignInfo,
          quoteSymbolsList
        }
        const tradingRewardsCampaignWithToken = {
          ...tradingRewardsCampaign,
          tradingRewardCampaignInfo
        } as TradingRewardsCampaign

        commit('setTradingRewardsCampaign', tradingRewardsCampaignWithToken)
      }
    },

    async fetchTradeRewardPoints({ commit }) {
      const { isUserWalletConnected, injectiveAddress } =
        this.app.$accessor.wallet

      if (!isUserWalletConnected || !injectiveAddress) {
        return
      }

      commit(
        'setTradeRewardPoints',
        await exchangeApi.fetchTradeRewardPoints([injectiveAddress])
      )
    },

    async fetchPendingTradeRewardPoints({ commit, state }) {
      const { isUserWalletConnected, injectiveAddress } =
        this.app.$accessor.wallet

      if (!isUserWalletConnected || !injectiveAddress) {
        return
      }

      const { params, tradingRewardsCampaign } = state

      if (!params || !tradingRewardsCampaign) {
        return
      }

      const pendingRewardsList =
        tradingRewardsCampaign.pendingTradingRewardPoolCampaignScheduleList

      if (pendingRewardsList.length === 0) {
        return
      }

      const rewards = await Promise.all(
        pendingRewardsList.map(async (pendingReward) => {
          const rewards = await exchangeApi.fetchPendingTradeRewardPoints(
            [injectiveAddress],
            pendingReward.startTimestamp
          )

          return rewards
            .reduce((total, reward) => {
              return total.plus(reward)
            }, ZERO_IN_BASE)
            .toFixed()
        })
      )

      commit('setPendingTradeRewardPoints', rewards)
    },

    async getMarketsHistory(
      { state, commit },
      {
        marketIds,
        resolution,
        countback
      }: { marketIds: string[]; resolution: number; countback: number }
    ) {
      const marketHistoryAlreadyExists = marketIds.every((marketId) => {
        return state.marketsHistory.find((marketHistory: UiMarketHistory) => {
          return marketHistory.marketId === marketId
        })
      })

      if (marketHistoryAlreadyExists) {
        return
      }

      const marketsHistory =
        await indexerRestMarketChronosApi.fetchMarketsHistory({
          marketIds,
          resolution,
          countback
        })

      const marketsHistoryToUiMarketsHistory =
        UiMarketsHistoryTransformer.marketsHistoryToUiMarketsHistory(
          marketsHistory
        )

      commit('setMarketsHistory', marketsHistoryToUiMarketsHistory)
    },

    async reset({ commit }) {
      await Promise.resolve(commit('reset'))
    }
  }
)
