import { createContext } from 'react'
import { MockStore } from './mock-store'

export interface StoreContextValue {
  store: MockStore
  refresh: () => void
}

export const StoreContext = createContext<StoreContextValue | undefined>(undefined)
