<template>
  <svg id="zh-flag">
    <defs>
      <clipPath id="clipPathFlag" clipPathUnits="userSpaceOnUse">
        <rect
          id="clipPathMask"
          width="398"
          height="398"
          x="57"
          y="57"
          rx="35"
          ry="35"
        />
      </clipPath>
    </defs>
    <g
      id="layer_back"
      inkscape:groupmode="layer"
      inkscape:label="back"
      style="display: inline"
    >
      <image
        id="image_back"
        x="0"
        y="0"
        width="64"
        height="64"
        xlink:href="/flags/back.png"
      />
    </g>
    <g
      id="layer_mask"
      x="57"
      y="57"
      width="398"
      height="398"
      inkscape:groupmode="layer"
      inkscape:label="mask"
      style="display: inline"
      clip-path="url(#clipPathFlag)"
    >
      <g
        id="flag_mask_group"
        x="57"
        y="57"
        width="64"
        height="64"
        transform="translate(57,57) scale(0.7775)"
      >
        <svg
          id="svg1"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
          xmlns:cc="http://creativecommons.org/ns#"
          xmlns:dc="http://purl.org/dc/elements/1.1/"
          height="64"
          width="64"
          version="1.1"
        >
          <metadata id="metadata2995">
            <rdf:RDF>
              <cc:Work rdf:about="">
                <dc:format>image/svg+xml</dc:format>
                <dc:type
                  rdf:resource="http://purl.org/dc/dcmitype/StillImage"
                />
              </cc:Work>
            </rdf:RDF>
          </metadata>
          <defs id="defs3">
            <clipPath id="clipPath3224" clipPathUnits="userSpaceOnUse">
              <rect
                id="rect3226"
                fill-opacity="0.67"
                height="500"
                width="500"
                y=".0000023437"
                x="250"
              />
            </clipPath>
          </defs>
          <g
            id="flag"
            clip-path="url(#clipPath3224)"
            transform="matrix(1.024 0 0 1.024 -256 -0.0000024)"
          >
            <g id="g578" stroke-width="1pt" transform="scale(16.667)">
              <rect
                id="rect124"
                height="30"
                width="60"
                y="0"
                x="0"
                fill="#006"
              />
              <g id="g584">
                <path
                  id="path146"
                  d="m0 0v3.3541l53.292 26.646h6.708v-3.354l-53.292-26.646h-6.708zm60 0v3.354l-53.292 26.646h-6.708v-3.354l53.292-26.646h6.708z"
                  fill="#fff"
                />
                <path
                  id="path136"
                  d="m25 0v30h10v-30h-10zm-25 10v10h60v-10h-60z"
                  fill="#fff"
                />
                <path
                  id="path141"
                  d="m0 12v6h60v-6h-60zm27-12v30h6v-30h-6z"
                  fill="#c00"
                />
                <path
                  id="path150"
                  d="m0 30 20-10h4.472l-20 10h-4.472zm0-30 20 10h-4.472l-15.528-7.7639v-2.2361zm35.528 10 20-10h4.472l-20 10h-4.472zm24.472 20-20-10h4.472l15.528 7.764v2.236z"
                  fill="#c00"
                />
              </g>
            </g>
          </g>
        </svg>
      </g>
    </g>
    <g
      id="layer_fore"
      inkscape:groupmode="layer"
      inkscape:label="fore"
      style="display: inline"
    >
      <image
        id="image_fore"
        x="0"
        y="0"
        width="64"
        height="64"
        xlink:href="/flags/fore.png"
      />
    </g>
  </svg>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  //
})
</script>
