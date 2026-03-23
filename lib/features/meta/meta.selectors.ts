import { createSelector } from "@reduxjs/toolkit"

import type { RootState } from "@/lib/store/store"

export const selectMetaState = (state: RootState) => state.meta

export const selectMetaStatus = createSelector(
  [selectMetaState],
  (meta) => meta.status
)

export const selectMetaError = createSelector(
  [selectMetaState],
  (meta) => meta.error
)

export const selectMetaBySymbol = createSelector(
  [selectMetaState],
  (meta) => meta.bySymbol
)
