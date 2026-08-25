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
  formatTokens,
  quotaUnitsToDollars,
} from '@/lib/format'

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
 * 最近修改时间：2026-08-26 01:58:23，移除环图仅保留分布表格，避免图表与列表并存导致的横向空间冲突。
 */
function BreakdownPanel(props: BreakdownPanelProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
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
          {(['tokens', 'quota', 'requests'] as const).map((placeholder) => (
            <Skeleton key={`skeleton-${placeholder}`} className='h-8 w-full' />
          ))}
        </div>
      </div>
    )
  } else if (hasData) {
    content = (
      <BreakdownTable
        items={sortedItems}
        nameColumnKey={props.nameColumnKey}
        locale={locale}
      />
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
 * [返回] 包含名称、请求、Token、单币 Token 数量和实际消费五列的紧凑表格节点。
 * 最近修改时间：2026-08-26 01:46:57，新增"1元 Token"列展示每 1 单位货币可用的 Token 数（tokens / displayAmount），公式对 USD/CNY/自定义币种一致。
 */
function BreakdownTable(props: BreakdownTableProps) {
  const { t } = useTranslation()
  const rows = props.items.slice(0, 8)

  return (
    <div className='overflow-hidden rounded-md border border-border/50'>
      <Table className='table-fixed text-xs [&_td]:!text-xs [&_th]:!text-xs'>
        <colgroup>
          <col className='w-[20%]' />
          <col className='w-[17%]' />
          <col className='w-[17%]' />
          <col className='w-[17%]' />
          <col className='w-[17%]' />
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
            <TableHead
              title={t('Tokens consumed per 1 unit of actual cost')}
              className='text-muted-foreground h-7 px-2 align-middle text-right text-xs font-medium'
            >
              {t('Per $1')}
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
            // 单币 Token 数 = 总 token / 显示金额（USD/CNY/自定义币种由 quotaUnitsToDollars 统一换算）
            const displayAmount = quotaUnitsToDollars(item.quota || 0)
            const tokensPerUnit = displayAmount > 0 ? tokens / displayAmount : 0
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
                <TableCell
                  title={`${formatNumber(tokens, props.locale)} / ${formatQuota(item.quota)}`}
                  className='px-2 py-1.5 align-middle text-right tabular-nums'
                >
                  {formatTokens(tokensPerUnit)}
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
