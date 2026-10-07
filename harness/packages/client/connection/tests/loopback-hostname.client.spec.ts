/** Shared loopback-hostname semantics for the Host fence and browser UI. */

import { describe, expect, it } from 'vitest'
import { isLoopbackHostname, isTrustedPageAuthority } from '../src/loopback-hostname.ts'

describe('isLoopbackHostname', () => {
  it('accepts localhost, IPv6 loopback, and the whole IPv4 127/8 block', () => {
    for (const hostname of ['localhost', '[::1]', '127.0.0.1', '127.8.9.10', '127.255.255.255']) {
      expect(isLoopbackHostname(hostname)).toBe(true)
    }
  })

  it('refuses malformed and non-loopback hostnames', () => {
    for (const hostname of ['remote.localhost', '::1', '128.0.0.1', '127.0.0', '127.0.0.256', '127.0.0.-1']) {
      expect(isLoopbackHostname(hostname)).toBe(false)
    }
  })
})

describe('isTrustedPageAuthority', () => {
  const trustedHosts = ['192.168.8.6:3082', 'harness.internal', 'tunnel.example:8443']

  it('accepts a page authority an entry declares exactly', () => {
    expect(isTrustedPageAuthority('192.168.8.6', '3082', trustedHosts)).toBe(true)
    expect(isTrustedPageAuthority('tunnel.example', '8443', trustedHosts)).toBe(true)
  })

  it('accepts a port-less entry on any port and is case-insensitive', () => {
    expect(isTrustedPageAuthority('harness.internal', '', trustedHosts)).toBe(true)
    expect(isTrustedPageAuthority('HARNESS.internal', '3000', trustedHosts)).toBe(true)
  })

  it('refuses a different port, hostname, or an undeclared empty list', () => {
    expect(isTrustedPageAuthority('192.168.8.6', '3081', trustedHosts)).toBe(false)
    expect(isTrustedPageAuthority('evil.example', '3082', trustedHosts)).toBe(false)
    expect(isTrustedPageAuthority('harness.internal', '', [])).toBe(false)
  })

  it('treats a default-port page as portless and refuses explicit default-port entries', () => {
    // `location.port` is '' on default ports; an explicit :443 entry matches
    // only a page literally addressed with that port (fence parity).
    expect(isTrustedPageAuthority('tunnel.example', '', ['tunnel.example:443'])).toBe(false)
    expect(isTrustedPageAuthority('tunnel.example', '443', ['tunnel.example:443'])).toBe(true)
    expect(isTrustedPageAuthority('tunnel.example', '', ['tunnel.example'])).toBe(true)
  })
})
