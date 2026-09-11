/**
 * InsForge API Client
 *
 * Provides typed access to InsForge backend services:
 * - Database (PostgreSQL via PostgREST)
 * - Auth
 * - Storage
 * - Edge Functions (Deno runtime)
 */

const API_URL = process.env.INSFORGE_API_URL || 'https://insforge.studysir.com'
const API_KEY = process.env.INSFORGE_API_KEY || 'ik_b18a23f7be7fc49cc451812f088a86ce51802d08bbc1e716922c31a7b9d47ae1'

interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

class InsForgeClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string = API_URL, apiKey: string = API_KEY) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'apikey': this.apiKey,
      ...options.headers
    }

    const init: RequestInit = {
      method: options.method || 'GET',
      headers
    }

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body)
    }

    const res = await fetch(url, init)
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || `InsForge API error: ${res.status}`)
    }

    return data as T
  }

  // Health check
  async health(): Promise<{ status: string }> {
    return this.request('/api/health')
  }

  // Database operations (via PostgREST)
  async query<T = any>(table: string, params?: Record<string, string>): Promise<T[]> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : ''
    return this.request<T[]>(`/rest/v1/${table}${queryString}`)
  }

  async insert<T = any>(table: string, data: unknown): Promise<T> {
    return this.request<T>(`/rest/v1/${table}`, {
      method: 'POST',
      body: data,
      headers: { 'Prefer': 'return=representation' }
    })
  }

  async update<T = any>(table: string, params: Record<string, string>, data: unknown): Promise<T> {
    const queryString = '?' + new URLSearchParams(params).toString()
    return this.request<T>(`/rest/v1/${table}${queryString}`, {
      method: 'PATCH',
      body: data,
      headers: { 'Prefer': 'return=representation' }
    })
  }

  async delete(table: string, params: Record<string, string>): Promise<void> {
    const queryString = '?' + new URLSearchParams(params).toString()
    await this.request(`/rest/v1/${table}${queryString}`, {
      method: 'DELETE'
    })
  }

  // Storage operations (InsForge S3-compatible buckets)
  async uploadFile(bucket: string, path: string, file: File | Blob): Promise<{ key: string; url: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${this.baseUrl}/api/storage/buckets/${bucket}/objects/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'apikey': this.apiKey
      },
      body: formData
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Upload failed: ${res.status} ${text}`)
    }

    const data = (await res.json().catch(() => ({}))) as { key?: string }
    const key = data.key || path
    return { key, url: this.getPublicUrl(bucket, key) }
  }

  getPublicUrl(bucket: string, path: string): string {
    return `${this.baseUrl}/api/storage/buckets/${bucket}/objects/${encodeURIComponent(path)}`
  }

  // Edge Functions (Deno runtime)
  async invokeFunction<T = any>(functionName: string, body?: unknown): Promise<T> {
    return this.request<T>(`/functions/${functionName}`, {
      method: 'POST',
      body
    })
  }

  // Email sending (uses InsForge's configured SMTP)
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    await this.request('/api/email/send-raw', {
      method: 'POST',
      body: { to, subject, html }
    })
  }
}

export const insforge = new InsForgeClient()
export default InsForgeClient
