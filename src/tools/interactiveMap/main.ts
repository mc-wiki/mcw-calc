import { parentOrigin } from '@/utils/iframe'
import { getParams, handleParseError, sz } from '@/utils/params'
import L from 'leaflet'
import { z } from 'zod'
import processJson from './processJson'
import smoothWheelScroll from './smoothWheelScroll'
import '@/init'
import './main.css'

L.Map.mergeOptions({
  // @section Mousewheel options
  // @option smoothWheelZoom: Boolean|String = true
  // Whether the map can be zoomed by using the mouse wheel. If passed `'center'`,
  // it will zoom to the center of the view regardless of where the mouse was.
  smoothWheelZoom: true,

  // @option smoothWheelZoom: number = 1
  // setting zoom speed
  smoothSensitivity: 1,
})
// @ts-expect-error smoothWheelZoom is not defined in the type
L.Map.SmoothWheelZoom = smoothWheelScroll
// @ts-expect-error smoothWheelZoom is not defined in the type
L.Map.addInitHook('addHandler', 'smoothWheelZoom', L.Map.SmoothWheelZoom)

const targetEl = document.querySelector('#app')!

;(async () => {
  const parsed = z
    .object({
      datapage: sz.string().default('Module:Maps/Minecraft_Dungeons_Mainland.json'),
      disableMarkerTitleLink: sz.boolean().default(false),
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)

  const disableMarkerTitleLink = params.disableMarkerTitleLink

  const json = await (
    await fetch(`${parentOrigin()}/w/${encodeURIComponent(params.datapage)}?action=raw`)
  ).json()

  const mapData = processJson(json)

  const map = L.map(targetEl as HTMLElement, {
    attributionControl: false,
    crs: L.CRS.Simple,
    scrollWheelZoom: false, // disable original zoom function
    // @ts-expect-error smoothWheelZoom is not defined in the type
    smoothWheelZoom: true, // enable smooth zoom
    smoothSensitivity: 3, // zoom speed. default is 1
    minZoom: -5,
  })

  L.imageOverlay(mapData.mapImage, mapData.mapBounds, {
    interactive: true,
  }).addTo(map)

  for (const marker of mapData.markers) {
    const category = mapData.categories.find((c) => c.id === marker.categoryId)!

    const icon = category.icon
      ? L.icon({
          iconUrl: category.icon,
          iconSize: [26, 26],
          iconAnchor: [13, 26],
        })
      : L.divIcon({
          iconSize: [20, 20],
          iconAnchor: [10, 20],
          html: `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="${category.color}">
              <path d="M10 0a7.65 7.65 0 0 0-8 8c0 2.52 2 5 3 6s5 6 5 6 4-5 5-6 3-3.48 3-6a7.65 7.65 0 0 0-8-8m0 11.25A3.25 3.25 0 1 1 13.25 8 3.25 3.25 0 0 1 10 11.25"/>
            </svg>
          `,
        })

    const popup = L.popup().setContent(`
        <h2>${disableMarkerTitleLink ? marker.popup.title : `<a href="${marker.popup.link.url}">${marker.popup.title}</a>`}</h2>
        <p>${marker.popup.description}</p>
        ${
          marker.popup.image ? `<img class="leaflet-popup-image" src="${marker.popup.image}" >` : ''
        }
        <a href="${
          marker.popup.link.url
        }" class="cdx-button cdx-button--action-progressive" role="button">
          ${marker.popup.link.label}
        </a>
      `)

    L.marker(marker.position, {
      icon,
    })
      .bindPopup(popup)
      .addTo(map)
  }

  map.fitBounds(mapData.mapBounds)
})()
