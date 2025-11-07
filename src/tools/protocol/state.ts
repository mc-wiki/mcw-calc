import type { Ref } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { ref } from 'vue'

export const useGlobalState = createGlobalState(() => {
  const nameStateMap = new Map<string, Ref<boolean>>()
  let selectedName: string | null = null

  function clearState() {
    nameStateMap.clear()
  }

  function requireName(name: string, scope: string) {
    const refName = ref(false)
    nameStateMap.set(`${scope}_${name}`, refName)
    return refName
  }

  function selectName(name: string, scope: string) {
    name = `${scope}_${name}`
    if (selectedName === name) return
    if (selectedName) {
      const ref = nameStateMap.get(selectedName)
      if (ref) ref.value = false
    }
    const ref = nameStateMap.get(name)
    if (ref) {
      selectedName = name
      ref.value = true
    }
  }

  function unselectName(name: string, scope: string) {
    name = `${scope}_${name}`
    if (selectedName === name) {
      const ref = nameStateMap.get(selectedName)
      if (ref) ref.value = false
      selectedName = null
    }
  }

  return { clearState, requireName, selectName, unselectName }
})
