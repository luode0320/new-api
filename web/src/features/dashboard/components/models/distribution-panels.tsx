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
import type { Datum, IPieChartSpec } from '@visactor/vchart'
import { Boxes, Layers } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
import { useThemeCustomization } from '@/context/theme-customization-provider'
import { useTheme } from '@/context/theme-provider'
import { getDashboardChartColors } from '@/features/dashboard/lib/charts'
import type { UsageBreakdownItem } from '@/features/dashboard/types'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber, formatQuota, formatTokens } from '@/lib/format'
import { useThemeRadiusPx } from '@/lib/theme-radius'

/**
 * 后端（model/log.go 的 GetLogUsageBreakdown）把空 group 归一为该 sentinel，
 * 前端负责翻译；这里集中处理避免组件各处各自判断。
 */
const UNGROUPED_SENTINEL = '__ungrouped__'

function displayName(name: string, t: (k: string) => string) {
  return name === UNGROUPED_SENTINEL ? t('Ungrouped') : name
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
 * 最近修改时间：2026-08-25 00:02:06，按参考截图收紧环图与列表的横向比例及垂直留白。
 */
function BreakdownPanel(props: BreakdownPanelProps) {
  const { t, i18n } = useTranslation()
  const { resolvedTheme } = useTheme()
  const { customization } = useThemeCustomization()
  const chartRadius = useThemeRadiusPx(
    '--radius-md',
    `${customization.preset}:${customization.radius}`
  )
  const [themeReady, setThemeReady] = useState(false)
  const themeManagerRef = useRef<
    (typeof import('@visactor/vchart'))['ThemeManager'] | null
  >(null)

  useEffect(() => {
    const updateTheme = async () => {
      setThemeReady(false)

      if (!themeManagerPromise) {
        themeManagerPromise = import('@visactor/vchart').then(
          (m) => m.ThemeManager
        )
      }

      const ThemeManager = await themeManagerPromise
      themeManagerRef.current = ThemeManager
      ThemeManager.setCurrentTheme(resolvedTheme === 'dark' ? 'dark' : 'light')
      setThemeReady(true)
    }

    updateTheme()
  }, [resolvedTheme])

  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  // 表格按实际消耗（quota）倒序排，饼图与表格保持同一视觉口径。
  const sortedItems = useMemo(() => {
    return [...props.items].sort((a, b) => (b.quota || 0) - (a.quota || 0))
  }, [props.items])

  const pieSpec = useMemo<IPieChartSpec>(() => {
    const values = sortedItems.map((item) => ({
      type: displayName(item.name, t),
      value: item.quota || 0,
    }))
    const domain = values.map((v) => v.type)
    const range = getDashboardChartColors(domain.length)

    return {
      type: 'pie',
      data: [{ id: 'distribution', values }],
      outerRadius: 0.78,
      innerRadius: 0.5,
      padAngle: 0.6,
      valueField: 'value',
      categoryField: 'type',
      pie: {
        style: chartRadius == null ? {} : { cornerRadius: chartRadius },
        state: {
          hover: { outerRadius: 0.82, stroke: '#000', lineWidth: 1 },
          selected: { outerRadius: 0.82, stroke: '#000', lineWidth: 1 },
        },
      },
      title: { visible: false },
      legends: { visible: false },
      label: {
        visible: true,
        formatMethod: (text: unknown, datum?: Datum) => {
          const data = datum as { type?: string } | undefined
          return data?.type ?? String(text ?? '')
        },
        style: {
          fontSize: 11,
        },
      },
      color: { type: 'ordinal', domain, range },
      tooltip: {
        mark: {
          content: [
            {
              key: (datum?: Datum) => String((datum as { type?: string })?.type ?? ''),
              value: (datum?: Datum) =>
                formatQuota(Number((datum as { value?: number })?.value) || 0),
            },
          ],
        },
      },
      background: { fill: 'transparent' },
      animation: true,
    }
  }, [sortedItems, chartRadius, t])

  const Icon = props.icon
  const hasData = sortedItems.length > 0
  const chartKey = [
    props.title,
    props.loading ? 'loading' : 'ready',
    sortedItems.length,
    resolvedTheme,
    customization.preset,
  ].join('-')

  let content: ReactNode
  if (props.loading) {
    content = (
      <div className='grid h-full grid-cols-1 gap-2 sm:grid-cols-2'>
        <Skeleton className='h-full w-full rounded-md' />
        <div className='space-y-2 p-1'>
          {(['tokens', 'quota', 'requests'] as const).map((placeholder) => (
            <Skeleton key={`skeleton-${placeholder}`} className='h-8 w-full' />
          ))}
        </div>
      </div>
    )
  } else if (themeReady && hasData) {
    content = (
      // 参考使用记录的紧凑组合：固定窄图表列，将剩余空间留给四列表格。
      <div className='grid grid-cols-1 items-center gap-2'>
        <BreakdownTable
          items={sortedItems}
          nameColumnKey={props.nameColumnKey}
          locale={locale}
        />
      </div>
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
  locale: Intl.LocalesArgument
}

/**
 * [参数] 分布项、名称列翻译键和数字格式化区域设置。
 * [返回] 包含名称、请求、Token 和实际消费四列的紧凑表格节点。
 * 最近修改时间：2026-08-25 00:10:59，按参考截图收紧表格密度并保持原有字段不变。
 */
function BreakdownTable(props: BreakdownTableProps) {
  const { t } = useTranslation()
  const rows = props.items.slice(0, 8)

  return (
    <div className='overflow-hidden rounded-md border border-border/50'>
      <Table className='table-fixed text-xs [&_td]:!text-xs [&_th]:!text-xs'>
        <colgroup>
          <col className='w-[25%]' />
          <col className='w-[19%]' />
          <col className='w-[20%]' />
          <col className='w-[19%]' />
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
            <TableHead className='text-muted-foreground h-7 px-2 align-middle text-right text-xs font-medium'>
              {t('Actual')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className='[&>tr]:!h-7'>
          {rows.map((item) => {
            const tokens =
              (item.input_tokens || 0) + (item.output_tokens || 0)
            return (
              <TableRow
                key={item.name}
                className='hover:bg-muted/30 border-b border-border/30 transition-colors'
              >
                <TableCell className='max-w-0 truncate px-2 py-1.5 align-middle font-medium'>
                  {displayName(item.name, t)}
                </TableCell>
                <TableCell className='px-2 py-1.5 align-middle text-right tabular-nums'>
                  {formatNumber(item.count, props.locale)}
                </TableCell>
                <TableCell className='px-2 py-1.5 align-middle text-right tabular-nums'>
                  {formatTokens(tokens)}
                </TableCell>
                <TableCell className='px-2 py-1.5 align-middle text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400'>
                  {formatQuota(item.quota)}
                </TableCell>
              </TableRow>
            )
          })}
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
    <div className='grid gap-3 md:grid-cols-2'>
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

let themeManagerPromise: Promise<
  (typeof import('@visactor/vchart'))['ThemeManager']
> | null = null
