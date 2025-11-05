import type { Ref } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { ref } from 'vue'

export const useGlobalState = createGlobalState(() => {
  const nameStateMap = new Map<string, Ref<boolean>>()
  let selectedName: string | null = null

  function clearState() {
    nameStateMap.clear()
  }

  function requireName(name: string) {
    const refName = ref(false)
    nameStateMap.set(name, refName)
    return refName
  }

  function selectName(name: string) {
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

  function unselectName(name: string) {
    if (selectedName === name) {
      const ref = nameStateMap.get(selectedName)
      if (ref) ref.value = false
      selectedName = null
    }
  }

  return { clearState, requireName, selectName, unselectName }
})
