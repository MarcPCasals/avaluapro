import { useSyncExternalStore } from 'react'

export function useDataAdapter(adapter) {
  return useSyncExternalStore(adapter.subscribe, adapter.getSnapshot, adapter.getSnapshot)
}
