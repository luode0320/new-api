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
import { Boxes, Layers } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { UsageBreakdownItem } from '@/features/dashboard/types'
import { toIntlLocale } from '@/i18n/languages'
import {
  formatNumber,
  formatQuota,
  quotaUnitsToDollars,
} from '@/lib/format'
import { getCurrencyLabel, isCurrencyDisplayEnabled } from '@/lib/currency'

/** 后端把空维度归一为这两个 sentinel，这里集中映射为当前语言的显示名。 */
const UNGROUPED_SENTINEL = '__ungrouped__'
const UNKNOWN_MODEL_SENTINEL = '__unknown__'

const MAX_VISIBLE_ROWS = 8

/**
 * [参数] 后端返回的维度名与翻译函数。
 * [返回] 面向用户的显示名，sentinel 译为当前语言，其余原样返回。
 * 最近修改时间：2026-10-25 19:08:15，新增 __unknown__ 归一化翻译。
 */
function displayName(name: string, t: (k: string) => string) {
  if (name === UNGROUPED_SENTINEL) return t('Ungrouped')
  if (name === UNKNOWN_MODEL_SENTINEL) return t('Unknown')
  return name
}

/**
 * [参数] 数值、数字格式化区域设置。
 * [返回] 用于 Token 数与单价的紧凑显示文本，非正数或非有限值返回 "-"。
 * 最近修改时间：2026-10-25 19:08:15，新建以替代 formatTokens 的 K/M 硬编码，避免 <1000 时直接输出原始浮点。
 */
function formatMetric(value: number, locale: Intl.LocalesArgument): string {
  if (!Number.isFinite(value) || value <= 0) return '-'

  const abs = Math.abs(value)
  if (abs >= 1e4) {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value)
  }
  if (abs >= 1) {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(value)
  }
  return new Intl.NumberFormat(locale, {
    maximumSignificantDigits: 2,
  }).format(value)
}

/**
 * [参数] 占比百分比、数字格式化区域设置。
 * [返回] 占比文本，非零但极小的值显示为 "<0.01%" 以免被四舍五入成 0%。
 * 最近修改时间：2026-10-25 19:08:15，新建以固定两位小数并保留极小占比。
 */
function formatShare(pct: number, locale: Intl.LocalesArgument): string {
  if (pct <= 0) return '0%'
  if (pct < 0.01) return '<0.01%'
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(pct)}%`
}

interface BreakdownPanelProps {
  title: string
  icon: typeof Boxes
  iconTone: IconBadgeTone
  items: UsageBreakdownItem[]
  loading: boolean
  nameColumnKey: 'Model' | 'Group'
}

/**
 * [参数] 分布面板标题、图标、分布数据和加载状态。
 * [返回] 模型或分组分布面板节点。
 * 最近修改时间：2026-10-25 19:08:15，保持环图移除后的纯表格布局，仅调整骨架行数。
 */
function BreakdownPanel(props: BreakdownPanelProps) {
  const { t } = useTranslation()
  // 表格按实际消耗（quota）倒序排，与面板排序口径保持一致。
  const sortedItems = useMemo(() => {
    return [...props.items].sort((a, b) => (b.quota || 0) - (a.quota || 0))
  }, [props.items])

  const Icon = props.icon
  const hasData = sortedItems.length > 0

  let content: ReactNode
  if (props.loading) {
    content = (
      <div className='grid h-full grid-cols-1 gap-2'>
        <div className='space-y-2 p-1'>
          {['tokens', 'quota', 'requests', 'per-unit', 'share'].map(
            (placeholder) => (
              <Skeleton key={`skeleton-${placeholder}`} className='h-7 w-full' />
            )
          )}
        </div>
      </div>
    )
  } else if (hasData) {
    content = (
      <BreakdownTable items={sortedItems} nameColumnKey={props.nameColumnKey} />
    )
  } else {
    content = (
      <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
        {t('No data')}
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-lg border'>
      <div className='flex w-full flex-col gap-1.5 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-3'>
        <div className='flex items-center gap-2'>
          <IconBadge tone={props.iconTone} size='sm'>
            <Icon />
          </IconBadge>
          <div className='text-sm font-semibold'>{props.title}</div>
        </div>
        <div className='text-muted-foreground text-xs'>
          {t('Sorted by actual consumption')}
        </div>
      </div>

      <div className='p-2'>{content}</div>
    </div>
  )
}

interface BreakdownTableProps {
  items: UsageBreakdownItem[]
  nameColumnKey: 'Model' | 'Group'
}

/**
 * [参数] 分布项与名称列翻译键。
 * [返回] 名称、请求数、Token、单位货币 Token 数和实际消费（含行内占比条）的紧凑表格节点。
 * 最近修改时间：2026-10-25 19:08:15，重设计列宽并新增占比条、溢出提示，单价列随货币设置自适应。
 */
function BreakdownTable(props: BreakdownTableProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const rows = props.items.slice(0, MAX_VISIBLE_ROWS)
  const hiddenCount = props.items.length - rows.length

  // 按 Token 计价时"每单位货币可用 Token 数"无意义，整列隐藏。
  const showPerCurrency = isCurrencyDisplayEnabled()
  const currencyLabel = getCurrencyLabel()

  // 占比分母取全部条目，包含被折叠的第 9 项及以后，避免占比之和不足 100%。
  const totalQuota = props.items.reduce(
    (sum, item) => sum + (item.quota || 0),
    0
  )

  return (
    <div className='overflow-hidden rounded-md border border-border/50'>
      <Table className='min-w-[26rem] table-fixed text-xs [&_td]:!text-xs [&_th]:!text-xs'>
        <colgroup>
          {showPerCurrency ? (
            <>
              <col className='w-[26%]' />
              <col className='w-[14%]' />
              <col className='w-[18%]' />
              <col className='w-[18%]' />
              <col className='w-[24%]' />
            </>
          ) : (
            <>
              <col className='w-[30%]' />
              <col className='w-[18%]' />
              <col className='w-[22%]' />
              <col className='w-[30%]' />
            </>
          )}
        </colgroup>
        <TableHeader>
          <TableRow className='hover:bg-transparent border-b border-border/50 bg-transparent'>
            <TableHead className='text-muted-foreground h-7 px-2 align-middle text-xs font-medium'>
              {t(props.nameColumnKey)}
            </TableHead>
            <TableHead className='text-muted-foreground h-7 px-2 align-middle text-right text-xs font-medium'>
              {t('Requests')}
            </TableHead>
            <TableHead className='text-muted-foreground h-7 px-2 align-middle text-right text-xs font-medium'>
              {t('Token')}
            </TableHead>
            {showPerCurrency && (
              <TableHead
                title={t('Tokens consumed per 1 unit of actual cost')}
                className='text-muted-foreground h-7 px-2 align-middle text-right text-xs font-medium'
              >
                {t('Token / {{currency}}', { currency: currencyLabel })}
              </TableHead>
            )}
            <TableHead className='text-muted-foreground h-7 px-2 align-middle text-right text-xs font-medium'>
              {t('Actual')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className='[&>tr]:!h-7'>
          {rows.map((item) => {
            const tokens = item.tokens || 0
            const quota = item.quota || 0
            const hasQuota = quota > 0
            const displayAmount = quotaUnitsToDollars(quota)
            const tokensPerUnit = displayAmount > 0 ? tokens / displayAmount : 0
            const share = totalQuota > 0 ? (quota / totalQuota) * 100 : 0
            const name = displayName(item.name, t)
            return (
              <TableRow
                key={item.name}
                className='hover:bg-muted/30 border-b border-border/30 transition-colors'
              >
                <TableCell
                  title={name}
                  className='max-w-0 truncate px-2 py-1.5 align-middle font-medium'
                >
                  {name}
                </TableCell>
                <TableCell className='px-2 py-1.5 align-middle text-right tabular-nums'>
                  {formatNumber(item.count, locale)}
                </TableCell>
                <TableCell
                  title={formatNumber(tokens, locale)}
                  className='px-2 py-1.5 align-middle text-right tabular-nums'
                >
                  {formatMetric(tokens, locale)}
                </TableCell>
                {showPerCurrency && (
                  <TableCell
                    title={`${formatNumber(tokens, locale)} / ${formatQuota(quota)}`}
                    className='px-2 py-1.5 align-middle text-right tabular-nums'
                  >
                    {formatMetric(tokensPerUnit, locale)}
                  </TableCell>
                )}
                <TableCell className='relative px-2 py-1.5 align-middle text-right'>
                  <div className='flex items-center justify-end gap-1.5'>
                    <span className='text-muted-foreground w-12 shrink-0 text-right text-[10px] tabular-nums'>
                      {hasQuota ? formatShare(share, locale) : '-'}
                    </span>
                    <span className='font-semibold tabular-nums text-emerald-600 dark:text-emerald-400'>
                      {hasQuota ? formatQuota(quota) : '-'}
                    </span>
                  </div>
                  {hasQuota && (
                    <span
                      aria-hidden='true'
                      className='absolute right-0 bottom-0 h-0.5 rounded-l-sm bg-emerald-500/35'
                      style={{ width: `${Math.min(share, 100)}%` }}
                    />
                  )}
                </TableCell>
              </TableRow>
            )
          })}
          {hiddenCount > 0 && (
            <TableRow className='hover:bg-transparent'>
              <TableCell
                colSpan={showPerCurrency ? 5 : 4}
                className='text-muted-foreground h-7 px-2 py-1 align-middle text-[11px]'
              >
                {t('+{{count}} more', { count: hiddenCount })}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

interface DistributionPanelsProps {
  modelItems: UsageBreakdownItem[]
  groupItems: UsageBreakdownItem[]
  loading: boolean
}

export function DistributionPanels(props: DistributionPanelsProps) {
  const { t } = useTranslation()

  return (
    // 五列含百分比与金额，面板宽度不足 600px 会挤压重叠，因此仅在 xl 以上并排。
    <div className='grid gap-3 xl:grid-cols-2'>
      <BreakdownPanel
        title={t('Model Distribution')}
        icon={Boxes}
        iconTone='chart-2'
        items={props.modelItems}
        loading={props.loading}
        nameColumnKey='Model'
      />
      <BreakdownPanel
        title={t('Group Distribution')}
        icon={Layers}
        iconTone='chart-3'
        items={props.groupItems}
        loading={props.loading}
        nameColumnKey='Group'
      />
    </div>
  )
}
