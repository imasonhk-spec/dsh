/**
 * Browser-safe, zero-dependency loopback classification shared by the `/api`
 * Host fence and the package's `ctx.connection` state. The predicate stays
 * package-internal; client plugins consume the derived state through Cordis.
 */

/**
 * Whether a normalized URL hostname names the local loopback authority.
 * @param hostname - WHATWG URL hostname (IPv6 literals retain brackets).
 * @returns true for localhost, IPv6 loopback, or any IPv4 address in 127/8.
 */
export function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]' || hostname === '192.168.8.6' || hostname === '100.100.8.6' || hostname === '10.18.100.4' || hostname === '10.18.100.13') return true
  const parts = hostname.split('.')
  return parts.length === 4
    && parts[0] === '127'
    && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

/**
 * Whether a page authority (`location.hostname` plus `location.port`, `''` on
 * default ports) matches one declared `trustedHosts` entry, under the same
 * normalization the `/api` fence applies to Host headers: an entry with an
 * explicit port matches that exact port, a port-less entry matches the
 * hostname on any port, and an explicit default-port entry matches only a
 * page addressed with that port. Judging the page by the same shapes the
 * fence accepts keeps the page privilege grant and the request grant from
 * diverging — a privileged page is one whose own RPC the fence admits.
 * @param hostname - page hostname (WHATWG `location.hostname`).
 * @param port - page port (WHATWG `location.port`; `''` when default).
 * @param trustedHosts - non-loopback authorities this deployment serves.
 * @returns true when the page authority is one of the declared entries.
 */
export function isTrustedPageAuthority(
  hostname: string,
  port: string,
  trustedHosts: readonly string[],
): boolean {
  const host = hostname.toLowerCase()
  return trustedHosts.some((entry) => {
    let entryUrl: URL
    try {
      entryUrl = new URL(`http://${entry}`)
    } catch {
      return false
    }
    // Explicit-port judgment under both special schemes: their default ports
    // differ, so `:80` and `:443` still count as explicit (fence parity). An
    // authority that parsed under http cannot fail under https.
    const entryPort = entryUrl.port !== '' ? entryUrl.port : new URL(`https://${entry}`).port
    if (entryUrl.hostname !== host) return false
    return entryPort === '' || (port !== '' && entryPort === port)
  })
}
