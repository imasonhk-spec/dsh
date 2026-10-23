/** General settings entry configuration. */
import type {} from '@deepseek-ai/dsh-settings'

import type { Context } from '@deepseek-ai/cordis'

import z from '@deepseek-ai/schemastery'

/** The entry carries no configuration of its own. */
export const Config = z.object({})

/** The browser consumes the configuration form projection.
 * @param ctx Plugin context used for optional settings presentation.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (child) => { child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)) })
}
