import {
  API_BASE_URL,
  API_HEADERS,
  DEFAULT_QUERY_TIMEOUT,
} from "@/lib/constants";
import type { ApiResponse } from "@/types";

export type APIRequestInit = Omit<
  globalThis.RequestInit,
  "body" | "headers"
> & {
  body?: unknown;
  headers?: HeadersInit;
  timeoutMs?: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiResponse<T>(payload: unknown): payload is ApiResponse<T> {
  return isObject(payload) && typeof payload.success === "boolean";
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-zA-Z0-9])/g, (_, ch: string) => ch.toUpperCase());
}

function camelizeKeysDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => camelizeKeysDeep(v)) as T;
  }

  if (!isObject(value)) {
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    out[toCamelCaseKey(k)] = camelizeKeysDeep(v);
  }
  return out as T;
}

export class APIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = API_BASE_URL, apiKey: string = "") {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private buildHeaders(body: unknown, customHeaders?: HeadersInit): Headers {
    const headers = new Headers(API_HEADERS as Record<string, string>);

    if (customHeaders) {
      new Headers(customHeaders).forEach((value, key) => {
        headers.set(key, value);
      });
    }

    // Let the browser/node fetch set the correct multipart boundary.
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      headers.delete("Content-Type");
    }

    // NOTE: X-API-Key is reserved for backend↔agent internal auth.
    // The browser should not send it by default.

    return headers;
  }

  private async parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }

  private unwrapEnvelope<T>(payload: unknown): T {
    // Go backend uses: { success, data, error, meta }
    if (isApiResponse<T>(payload)) {
      const envelope = payload;
      if (envelope.success) return camelizeKeysDeep(envelope.data as T);

      const message = envelope.error?.message || "Request failed";
      throw new Error(message);
    }

    // Some older/other endpoints may use: { status, data, message }
    if (isObject(payload) && "data" in payload) {
      return camelizeKeysDeep((payload as { data: T }).data);
    }

    return camelizeKeysDeep(payload as T);
  }

  async request<T>(
    endpoint: string,
    options: APIRequestInit & { method: string } = { method: "GET" },
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const { timeoutMs, body, headers: customHeaders, ...rest } = options;
    const effectiveTimeoutMs = timeoutMs ?? DEFAULT_QUERY_TIMEOUT;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), effectiveTimeoutMs);

    try {
      const headers = this.buildHeaders(body, customHeaders);

      const config: globalThis.RequestInit = {
        ...rest,
        headers,
        signal: controller.signal,
      };

      // Body handling
      if (body === undefined || body === null) {
        delete (config as { body?: unknown }).body;
      } else if (typeof FormData !== "undefined" && body instanceof FormData) {
        config.body = body as BodyInit;
      } else if (
        typeof body === "string" ||
        body instanceof Blob ||
        body instanceof ArrayBuffer
      ) {
        config.body = body as BodyInit;
      } else if (typeof body === "object") {
        config.body = JSON.stringify(body);
      } else {
        config.body = String(body);
      }

      const response = await fetch(url, config);
      const payload = await this.parseBody(response);

      if (!response.ok) {
        // Prefer backend envelope error message when available.
        if (isObject(payload)) {
          const errVal = payload.error;
          if (isObject(errVal) && typeof errVal.message === "string") {
            throw new Error(errVal.message);
          }
          if (typeof errVal === "string") {
            throw new Error(errVal);
          }
          if (typeof payload.message === "string") {
            throw new Error(payload.message);
          }
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return this.unwrapEnvelope<T>(payload);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("Request timed out");
      }
      const message =
        error instanceof Error ? error.message : "Network request failed";
      throw new Error(`API Error: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async get<T>(endpoint: string, options?: APIRequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: APIRequestInit,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: APIRequestInit,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  async delete<T>(endpoint: string, options?: APIRequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: APIRequestInit,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}

// Singleton
const apiClient = new APIClient();
export default apiClient;
