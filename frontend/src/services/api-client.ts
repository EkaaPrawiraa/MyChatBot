import { API_BASE_URL, API_HEADERS, DEFAULT_QUERY_TIMEOUT } from '@/lib/constants'
import { ApiResponse, APIEnvelope } from '@/types'

interface RequestInit extends Omit<RequestInit, 'body'> {
  body?: unknown
}

export class APIClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string = API_BASE_URL, apiKey: string = '') {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers = {
      ...API_HEADERS,
      ...customHeaders,
    }

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey
    }

    return headers
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    let data: unknown

    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      const errorMessage = typeof data === 'object' && data !== null && 'error' in data 
        ? (data as Record<string, unknown>).error 
        : `HTTP ${response.status}`
      throw new Error(String(errorMessage))
    }

    // Handle wrapped responses
    if (typeof data === 'object' && data !== null && 'data' in data) {
      return (data as APIEnvelope<T>).data as T
    }

    return data as T
  }

  async request<T>(
    endpoint: string,
    options: RequestInit & { method: string } = { method: 'GET' }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      ...options,
      headers: this.getHeaders(options.headers as Record<string, string>),
      timeout: options.timeout || DEFAULT_QUERY_TIMEOUT,
    }

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body)
    } else if (options.body) {
      config.body = options.body as BodyInit
    }

    try {
      const response = await fetch(url, config as RequestInit)
      return this.handleResponse<T>(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network request failed'
      throw new Error(`API Error: ${message}`)
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body })
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body })
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }
}

// Create a singleton instance
const apiClient = new APIClient()
export default apiClient
