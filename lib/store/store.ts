import { configureStore } from "@reduxjs/toolkit"

import { metaReducer } from "@/lib/features/meta/meta-slice"
import { tickerReducer } from "@/lib/features/ticker/ticker-slice"
import { socketMiddleware } from "@/lib/store/socket-middleware"

export function makeStore() {
  return configureStore({
    reducer: {
      ticker: tickerReducer,
      meta: metaReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(socketMiddleware),
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore["getState"]>
export type AppDispatch = AppStore["dispatch"]
