import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import type {
  CoinMeta,
  CoinMetadataResponse,
} from "@/lib/features/meta/meta.types"
import type { RootState } from "@/lib/store/store"

export interface MetaState {
  bySymbol: Record<string, CoinMeta>
  status: "idle" | "loading" | "succeeded" | "failed"
  error: string | null
}

const initialState: MetaState = {
  bySymbol: {},
  status: "idle",
  error: null,
}

export const fetchCoinMetadata = createAsyncThunk<
  CoinMeta[],
  string[],
  { state: RootState; rejectValue: string }
>("meta/fetchCoinMetadata", async (symbols, thunkApi) => {
  const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.toUpperCase()))]

  if (uniqueSymbols.length === 0) {
    return []
  }

  try {
    const params = new URLSearchParams()
    params.set("symbols", uniqueSymbols.join(","))

    const response = await fetch(`/api/proxy/coingecko?${params.toString()}`)

    if (!response.ok) {
      throw new Error("Falha ao buscar metadados das moedas.")
    }

    const payload = (await response.json()) as CoinMetadataResponse

    return payload.coins
  } catch (error) {
    return thunkApi.rejectWithValue(
      error instanceof Error ? error.message : "Falha ao carregar metadados."
    )
  }
})

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
  extraReducers: (builder) => {
    builder
      .addCase(fetchCoinMetadata.pending, (state) => {
        state.status = "loading"
        state.error = null
      })
      .addCase(fetchCoinMetadata.fulfilled, (state, action) => {
        for (const coin of action.payload) {
          state.bySymbol[coin.symbol] = coin
        }

        state.status = "succeeded"
      })
      .addCase(fetchCoinMetadata.rejected, (state, action) => {
        state.status = "failed"
        state.error = action.payload ?? "Falha ao carregar metadados."
      })
  },
})

export const { metaRequested, metaReceived, metaRequestFailed } =
  metaSlice.actions

export const metaReducer = metaSlice.reducer
