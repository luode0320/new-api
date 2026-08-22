/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useApiInfo } from '@/features/dashboard/hooks/use-status-data'
import { cn } from '@/lib/utils'
import { getBgColorClass } from '@/lib/colors'

interface ApiInfoBannerProps {
  /**
   * When true, render an inline (anchored) banner — one inline row per API.
   * When false, render as a stacked banner where each row lives on its own line.
   * Defaults to true (compact) for use inside headers / actions slots.
   */
  variant?: 'inline' | 'stacked'
  /** Optional className for outer container. */
  className?: string
  /** Limit rendered API entries (defaults to no limit). */
  maxItems?: number
}

/**
 * Compact reuse of the dashboard's "API Info" panel — renders the same
 * `useApiInfo()` data (same hook, same React Query queryKey, same
 * `/api/status` endpoint) as the dashboard's full panel, but stripped
 * down to just route label + URL + copy button per item.
 *
 * Behaviour:
 * - Returns `null` while loading and the list is empty (no flicker).
 * - Returns `null` once loaded with an empty list (feature disabled /
 *   no API routes configured — same as the dashboard panel's empty state).
 * - Reuses the cached `['status']` query so navigation between overview
 *   and any other page does NOT refetch.
 */
export function ApiInfoBanner({
  variant = 'inline',
  className,
  maxItems,
}: ApiInfoBannerProps) {
  const { t } = useTranslation()
  const { items, loading } = useApiInfo()

  if (loading && items.length === 0) return null
  if (items.length === 0) return null

  const list = typeof maxItems === 'number' ? items.slice(0, maxItems) : items
  const isInline = variant === 'inline'

  return (
    <div
      role='group'
      aria-label={t('API Info')}
      className={cn(
        'border-border/60 bg-muted/40 text-foreground rounded-lg border text-xs shadow-xs',
        isInline
          ? 'flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2.5 py-1.5'
          : 'flex flex-col divide-y divide-border/60',
        className
      )}
    >
      {list.map((item) => (
        <div
          key={item.url}
          className={cn(
            'flex min-w-0 items-center gap-2',
            isInline ? 'min-w-0' : 'px-3 py-2 sm:px-4'
          )}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  className={cn(
                    'inline-block size-1.5 shrink-0 rounded-full',
                    getBgColorClass(item.color)
                  )}
                  aria-hidden='true'
                />
              }
            />
            <TooltipContent>{item.description || item.route}</TooltipContent>
          </Tooltip>

          <span className='font-mono text-xs font-semibold whitespace-nowrap'>
            {item.route}
          </span>

          <Tooltip>
            <TooltipTrigger
              render={
                <span className='text-muted-foreground min-w-0 truncate font-mono text-xs'>
                  {item.url}
                </span>
              }
            />
            <TooltipContent>{item.url}</TooltipContent>
          </Tooltip>

          <CopyButton
            value={item.url}
            variant='ghost'
            size='icon'
            className='size-6'
            tooltip={t('Copy URL')}
            successTooltip={t('Copied!')}
            aria-label={t('Copy URL')}
          />
        </div>
      ))}
    </div>
  )
}
