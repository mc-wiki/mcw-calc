import { parseWikitext } from '@/utils/i18n'

export type Coordinate = [number, number]
export interface FandomMapConfig {
  mapImage: string
  coordinateOrder: 'xy' | 'yx' | string
  mapBounds: [Coordinate, Coordinate]
  origin: 'bottom-left'
  categories: {
    id: string
    listId: number
    name: string
    color: string
    symbol: string
    symbolColor: string
    icon?: string
  }[]
  markers: {
    categoryId: string
    position: Coordinate
    popup: {
      title: string
      description: string
      link: {
        url: string
        label: string
      }
      image?: string
    }
    id: string
  }[]
}

export default function processJson({
  mapImage,
  coordinateOrder,
  mapBounds,
  // origin,
  categories,
  markers,
}: FandomMapConfig) {
  return {
    mapImage: getImageLink(mapImage),
    mapBounds: [
      convertCoordinate(mapBounds[0], coordinateOrder),
      convertCoordinate(mapBounds[1], coordinateOrder),
    ] as [Coordinate, Coordinate],

    categories: categories.map((category) => ({
      ...category,
      icon: category.icon ? getImageLink(category.icon) : undefined,
    })),

    markers: markers.map((marker) => ({
      ...marker,
      position: convertCoordinate(marker.position, coordinateOrder),
      popup: {
        ...marker.popup,
        description: parseWikitext(marker.popup.description),
        link: {
          ...marker.popup.link,
          url: window.parent.location.origin + '/w/' + marker.popup.link.url,
        },
        image: marker.popup.image ? getImageLink(marker.popup.image) : undefined,
      },
    })),
  }
}

export function convertCoordinate(
  coordinate: Coordinate,
  coordinateOrder: FandomMapConfig['coordinateOrder'],
): Coordinate {
  return coordinateOrder == 'yx' ? coordinate : (coordinate.slice().reverse() as Coordinate)
}

export function getImageLink(image: string) {
  const imageNameNormalized = image.replace(/File:/g, '').replace(/ /g, '_')
  return `${window.parent.location.origin}/images/${encodeURIComponent(imageNameNormalized)}`
}
