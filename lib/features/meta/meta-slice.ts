import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type { CoinMeta } from "@/lib/features/meta/meta.types"

interface MetaState {
  bySymbol: Record<string, CoinMeta>
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
}

const initialState: MetaState = {
  bySymbol: {},
  status: "idle",
  error: null,
}

const metaSlice = createSlice({
  name: "meta",
  initialState,
  reducers: {
    metaRequested(state) {
      state.status = "loading"
      state.error = null
    },
    metaReceived(state, action: PayloadAction<CoinMeta[]>) {
      for (const coin of action.payload) {
        state.bySymbol[coin.symbol] = coin
      }

      state.status = "succeeded"
    },
    metaRequestFailed(state, action: PayloadAction<string>) {
      state.status = "failed"
      state.error = action.payload
    },
  },
})

export const { metaRequested, metaReceived, metaRequestFailed } =
  metaSlice.actions

export const metaReducer = metaSlice.reducer
