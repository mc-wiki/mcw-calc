/**
 * @public
 * @dependencies mediawiki.jqueryMsg
 */

import L from 'leaflet'
import processJson from './processJson'
import './main.css'
import getParams from '@/utils/getParams'

/** LICENSE MIT START */
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

L.Map.SmoothWheelZoom = L.Handler.extend({
  addHooks: function () {
    L.DomEvent.on(this._map._container, 'wheel', this._onWheelScroll, this)
  },

  removeHooks: function () {
    L.DomEvent.off(this._map._container, 'wheel', this._onWheelScroll, this)
  },

  _onWheelScroll: function (e) {
    if (!this._isWheeling) {
      this._onWheelStart(e)
    }
    this._onWheeling(e)
  },

  _onWheelStart: function (e) {
    const map = this._map
    this._isWheeling = true
    this._wheelMousePosition = map.mouseEventToContainerPoint(e)
    this._centerPoint = map.getSize()._divideBy(2)
    this._startLatLng = map.containerPointToLatLng(this._centerPoint)
    this._wheelStartLatLng = map.containerPointToLatLng(this._wheelMousePosition)
    this._startZoom = map.getZoom()
    this._moved = false
    this._zooming = true

    map._stop()
    if (map._panAnim) map._panAnim.stop()

    this._goalZoom = map.getZoom()
    this._prevCenter = map.getCenter()
    this._prevZoom = map.getZoom()

    this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this))
  },

  _onWheeling: function (e) {
    const map = this._map

    this._goalZoom =
      this._goalZoom + L.DomEvent.getWheelDelta(e) * 0.003 * map.options.smoothSensitivity
    if (this._goalZoom < map.getMinZoom() || this._goalZoom > map.getMaxZoom()) {
      this._goalZoom = map._limitZoom(this._goalZoom)
    }
    this._wheelMousePosition = this._map.mouseEventToContainerPoint(e)

    clearTimeout(this._timeoutId)
    this._timeoutId = setTimeout(this._onWheelEnd.bind(this), 200)

    L.DomEvent.preventDefault(e)
    L.DomEvent.stopPropagation(e)
  },

  _onWheelEnd: function (e) {
    this._isWheeling = false
    cancelAnimationFrame(this._zoomAnimationId)
    this._map._moveEnd(true)
  },

  _updateWheelZoom: function () {
    const map = this._map

    if (!map.getCenter().equals(this._prevCenter) || map.getZoom() != this._prevZoom) return

    this._zoom = map.getZoom() + (this._goalZoom - map.getZoom()) * 0.3
    this._zoom = Math.floor(this._zoom * 100) / 100

    const delta = this._wheelMousePosition.subtract(this._centerPoint)
    if (delta.x === 0 && delta.y === 0) return

    if (map.options.smoothWheelZoom === 'center') {
      this._center = this._startLatLng
    } else {
      this._center = map.unproject(
        map.project(this._wheelStartLatLng, this._zoom).subtract(delta),
        this._zoom,
      )
    }

    if (!this._moved) {
      map._moveStart(true, false)
      this._moved = true
    }

    map._move(this._center, this._zoom)
    this._prevCenter = map.getCenter()
    this._prevZoom = map.getZoom()

    this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this))
  },
})

L.Map.addInitHook('addHandler', 'smoothWheelZoom', L.Map.SmoothWheelZoom)
/** LICENSE MIT END */

const targetEls = document.querySelectorAll('.mcw-calc[data-type="interactiveMap"]')
for (const targetEl of targetEls) {
  if (!(targetEl instanceof HTMLElement)) throw 'wtf'

  const params = getParams(targetEl, ['dataPage'], {
    dataPage: 'Module:Maps/Minecraft_Dungeons_Mainland.json',
  })

  $.getJSON(mw.util.getUrl(params.get('dataPage'), { action: 'raw' })).then((json) => {
    const mapData = processJson(json)

    const map = L.map(targetEl, {
      attributionControl: false,
      crs: L.CRS.Simple,
      scrollWheelZoom: false, // disable original zoom function
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
        <h3><a href="${marker.popup.link.url}">${marker.popup.title}</a></h3>
        <p>${marker.popup.description}</p>
        ${
          marker.popup.image ? `<img class="leaflet-popup-image" src="${marker.popup.image}" >` : ''
        }
        <a href="${marker.popup.link.url}" class="mw-ui-button mw-ui-progressive" role="button">
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
  })
}
