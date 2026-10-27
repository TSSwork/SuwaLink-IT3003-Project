import { AxiosError } from "axios"
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios"
import { api } from "@/api/client"
import type { ApiFieldError } from "@/api/types"

export interface Call {
  /** Lower case, e.g. "get", "post". */
  method: string
  url: string
  params: Record<string, unknown>
  /** The request body: parsed JSON, a FormData, or undefined. */
  data: unknown
  /** The Authorization header, when one was sent. */
  authorization?: string
}

type Handler = (call: Call) => unknown

/** Answers with `{ success, data }`; a handler that throws `fail(...)` answers with an error. */
export function mockApi(handlers: Record<string, Handler>) {
  const calls: Array<Call> = []
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const call = {
      method: (config.method ?? "get").toLowerCase(),
      url: config.url ?? "",
      params: { ...(config.params as Record<string, unknown> | undefined) },
      data: parseBody(config.data),
      ...(config.headers.get("Authorization") && {
        authorization: String(config.headers.get("Authorization")),
      }),
    }
    calls.push(call)
    const handler = handlers[call.url] as Handler | undefined
    if (!handler) return Promise.reject(new Error(`unexpected ${call.url}`))
    try {
      // A handler may return a promise, e.g. to keep a request pending.
      const data = await handler(call)
      return Promise.resolve({
        data:
          data instanceof Raw
            ? data.body
            : { success: true, message: "", data },
        status: 200,
        statusText: "",
        headers: {},
        config,
      })
    } catch (error) {
      if (!(error instanceof Failure)) return Promise.reject(error)
      return Promise.reject(
        new AxiosError("failed", "ERR_BAD_RESPONSE", config, null, {
          data: {
            success: false,
            code: error.code,
            message: "English",
            errors: error.errors,
          },
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

function parseBody(data: unknown): unknown {
  if (typeof data !== "string") return data
  try {
    return JSON.parse(data)
  } catch {
    return data
  }
}

class Raw {
  constructor(readonly body: unknown) {}
}

/** Return from a handler to answer with this body as-is (e.g. a Blob), not in the envelope. */
export function raw(body: unknown): Raw {
  return new Raw(body)
}

class Failure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly errors: Array<ApiFieldError>
  ) {
    super(code)
  }
}

/** Throw from a handler to answer with an API error (and field errors, e.g. for VALIDATION_FAILED). */
export function fail(
  status: number,
  code: string,
  errors: Array<ApiFieldError> = []
): never {
  throw new Failure(status, code, errors)
}
