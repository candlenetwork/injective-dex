<template>
  <Dropdown>
    <template slot="title">
      <div class="w-20 flex items-center">
        <IconGlobe class="w-4" />
        <span class="text-xs ml-2">{{ activeLocale.locale }}</span>
      </div>
    </template>

    <div class="text-center cursor-pointer">
      <SelectorItem
        v-for="locale in locales"
        :key="`locale-${locale.name}`"
        :item="locale"
        @click="handleClick"
      >
        {{ locale.name }}
      </SelectorItem>
    </div>
  </Dropdown>
</template>

<script lang="ts">
import Vue from 'vue'
import SelectorItem from './selector-item.vue'
import Dropdown from '~/components/elements/dropdown.vue'
import { Locale, locales } from '~/locales'

export default Vue.extend({
  components: {
    SelectorItem,
    Dropdown
  },

  data() {
    return {
      locales
    }
  },

  computed: {
    activeLocale(): Locale {
      return this.$accessor.app.locale
    }
  },

  methods: {
    handleClick(locale: Locale) {
      this.$i18n.locale = locale.locale
      this.$accessor.app.setAppLocale(locale)
    }
  }
})
</script>
