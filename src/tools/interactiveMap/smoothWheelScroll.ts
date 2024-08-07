// @ts-nocheck smoothWheelScroll is not defined in the type
// License MIT
import L from 'leaflet'

export default L.Handler.extend({
  addHooks() {
    L.DomEvent.on(this._map._container, 'wheel', this._onWheelScroll, this)
  },

  removeHooks() {
    L.DomEvent.off(this._map._container, 'wheel', this._onWheelScroll, this)
  },

  _onWheelScroll(e) {
    if (!this._isWheeling) {
      this._onWheelStart(e)
    }
    this._onWheeling(e)
  },

  _onWheelStart(e) {
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

  _onWheeling(e) {
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

  _onWheelEnd() {
    this._isWheeling = false
    cancelAnimationFrame(this._zoomAnimationId)
    this._map._moveEnd(true)
  },

  _updateWheelZoom() {
    const map = this._map

    if (!map.getCenter().equals(this._prevCenter) || map.getZoom() !== this._prevZoom) return

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
