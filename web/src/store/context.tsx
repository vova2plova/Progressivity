import { useCallback, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import { MockStore } from './mock-store'
import { StoreContext, type StoreContextValue } from './store-context'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new MockStore())
  const [, forceUpdate] = useReducer((x) => x + 1, 0)

  const refresh = useCallback(() => {
    forceUpdate()
  }, [])

  const contextValue: StoreContextValue = {
    store,
    refresh,
  }

  return <StoreContext.Provider value={contextValue}>{children}</StoreContext.Provider>
}
