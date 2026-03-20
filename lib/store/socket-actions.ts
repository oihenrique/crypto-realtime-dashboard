import { createAction } from "@reduxjs/toolkit"

export interface ConnectSocketPayload {
  symbols: string[]
}

export const connectSocket = createAction<ConnectSocketPayload>("socket/connect")
export const disconnectSocket = createAction("socket/disconnect")
