export function base64DecodeToUtf8(input: string): string {
  if (!input) return ''

  // Browser
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    // atob returns a binary string; decode as UTF-8
    const binary = window.atob(input)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  }

  // Node.js (Next server)
  // eslint-disable-next-line no-undef
  return Buffer.from(input, 'base64').toString('utf8')
}

export function base64EncodeUtf8(input: string): string {
  if (!input) return ''

  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    const bytes = new TextEncoder().encode(input)
    let binary = ''
    bytes.forEach((b) => {
      binary += String.fromCharCode(b)
    })
    return window.btoa(binary)
  }

  // eslint-disable-next-line no-undef
  return Buffer.from(input, 'utf8').toString('base64')
}
