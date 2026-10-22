import { AxiosError } from "axios"
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios"
import { api } from "@/api/client"

export interface Call {
  /** Lower case, e.g. "get", "post". */
  method: string
  url: string
  params: Record<string, unknown>
}

type Handler = (call: Call) => unknown

/** Answers with `{ success, data }`; a handler that throws `fail(...)` answers with an error. */
export function mockApi(handlers: Record<string, Handler>) {
  const calls: Array<Call> = []
  const adapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
    const call = {
      method: (config.method ?? "get").toLowerCase(),
      url: config.url ?? "",
      params: { ...(config.params as Record<string, unknown> | undefined) },
    }
    calls.push(call)
    const handler = handlers[call.url] as Handler | undefined
    if (!handler) return Promise.reject(new Error(`unexpected ${call.url}`))
    try {
      const data = handler(call)
      return Promise.resolve({
        data: { success: true, message: "", data },
        status: 200,
        statusText: "",
        headers: {},
        config,
      })
    } catch (error) {
      if (!(error instanceof Failure)) throw error
      return Promise.reject(
        new AxiosError("failed", "ERR_BAD_RESPONSE", config, null, {
          data: { success: false, code: error.code, message: "English" },
          status: error.status,
          statusText: "",
          headers: {},
          config,
        })
      )
    }
  }
  const original = api.defaults.adapter
  api.defaults.adapter = adapter
  return {
    calls,
    callsTo: (url: string) => calls.filter((c) => c.url === url),
    restore: () => {
      api.defaults.adapter = original
    },
  }
}

class Failure extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(code)
  }
}

/** Throw from a handler to answer with an API error. */
export function fail(status: number, code: string): never {
  throw new Failure(status, code)
}
