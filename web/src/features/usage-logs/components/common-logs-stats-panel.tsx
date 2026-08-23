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
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatLogQuota,
  formatNumber,
  formatTokens,
  formatUseTime,
} from '@/lib/format'
import { cn } from '@/lib/utils'

import { getLogStats, getUserLogStats } from '../api'
import { DEFAULT_LOG_STATS } from '../constants'
import { buildApiParams } from '../lib/utils'
import type { UsageBreakdownItem } from '../types'
import { useLogsViewScope, useUsageLogsContext } from './usage-logs-provider'

const route = getRouteApi('/_authenticated/usage-logs/$section')

const PIE_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#ef4444',
  '#84cc16',
  '#6366f1',
  '#f97316',
]

function colorAt(index: number): string {
  return PIE_COLORS[index % PIE_COLORS.length]
}

function StatCard(props: {
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <Card className='gap-2 py-4'>
      <CardHeader className='gap-1 px-4'>
        <span className='text-muted-foreground text-xs font-medium'>
          {props.label}
        </span>
      </CardHeader>
      <CardContent className='px-4'>
        <div className='flex items-center gap-2'>
          <span
            className={cn('h-4 w-1 rounded-full', props.accent)}
            aria-hidden
          />
          <span className='text-foreground text-xl font-semibold tabular-nums'>
            {props.value}
          </span>
        </div>
        {props.sub ? (
          <p className='text-muted-foreground mt-1 text-xs'>{props.sub}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function DistributionCard(props: {
  title: string
  items: UsageBreakdownItem[]
  emptyText: string
}) {
  const { t } = useTranslation()
  const totalQuota = props.items.reduce((sum, item) => sum + item.quota, 0)

  if (props.items.length === 0) {
    return (
      <Card className='gap-2'>
        <CardHeader className='px-4'>
          <CardTitle className='text-sm font-semibold'>{props.title}</CardTitle>
        </CardHeader>
        <CardContent className='text-muted-foreground flex h-40 items-center justify-center px-4 text-sm'>
          {props.emptyText}
        </CardContent>
      </Card>
    )
  }

  const data = props.items.map((item) => ({
    name: item.name,
    value: item.quota,
  }))

  return (
    <Card className='gap-2'>
      <CardHeader className='px-4'>
        <CardTitle className='text-sm font-semibold'>{props.title}</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-3 px-4 sm:flex-row sm:items-center'>
        <div className='h-44 w-full sm:w-44'>
          <ResponsiveContainer width='100%' height='100%'>
            <PieChart>
              <Pie
                data={data}
                dataKey='value'
                nameKey='name'
                innerRadius={40}
                outerRadius={72}
                paddingAngle={1}
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={colorAt(index)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  formatLogQuota(Number(value ?? 0)),
                  t('Consumption'),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
          {props.items.map((item, index) => {
            const percent =
              totalQuota > 0 ? ((item.quota / totalQuota) * 100).toFixed(1) : '0'
            return (
              <div
                key={item.name}
                className='flex items-center gap-2 text-xs'
              >
                <span
                  className='h-2.5 w-2.5 shrink-0 rounded-sm'
                  style={{ backgroundColor: colorAt(index) }}
                />
                <span className='text-foreground/90 min-w-0 flex-1 truncate font-medium'>
                  {item.name}
                </span>
                <span className='text-muted-foreground tabular-nums'>
                  {percent}%
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function CommonLogsStatsPanel() {
  const { t } = useTranslation()
  const { isAdminView: isAdmin } = useLogsViewScope()
  const searchParams = route.useSearch()
  const { sensitiveVisible } = useUsageLogsContext()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['usage-logs-stats', isAdmin, searchParams],
    queryFn: async () => {
      const params = buildApiParams({
        page: 1,
        pageSize: 1,
        searchParams,
        columnFilters: [],
        isAdmin,
      })
      const result = isAdmin
        ? await getLogStats(params)
        : await getUserLogStats(params)
      return result.success ? result.data || DEFAULT_LOG_STATS : DEFAULT_LOG_STATS
    },
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  })

  if (isLoading) {
    return (
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <Skeleton className='h-[88px] rounded-lg' />
        <Skeleton className='h-[88px] rounded-lg' />
        <Skeleton className='h-[88px] rounded-lg' />
        <Skeleton className='h-[88px] rounded-lg' />
      </div>
    )
  }

  const totalTokens = (stats?.input_tokens || 0) + (stats?.output_tokens || 0)
  const quotaValue = sensitiveVisible
    ? formatLogQuota(stats?.quota || 0)
    : '••••'

  return (
    <div className='flex flex-col gap-3'>
      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <StatCard
          label={t('Total Requests')}
          value={formatNumber(stats?.count || 0)}
          accent='bg-sky-500/70'
        />
        <StatCard
          label={t('Total Tokens')}
          value={formatTokens(totalTokens)}
          sub={`${t('Input Tokens')} ${formatTokens(stats?.input_tokens || 0)} · ${t('Output Tokens')} ${formatTokens(stats?.output_tokens || 0)}`}
          accent='bg-violet-500/70'
        />
        <StatCard
          label={t('Total Consumption')}
          value={quotaValue}
          accent='bg-emerald-500/70'
        />
        <StatCard
          label={t('Average latency')}
          value={formatUseTime(stats?.avg_use_time || 0)}
          accent='bg-amber-500/70'
        />
      </div>

      <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
        <DistributionCard
          title={t('Model Distribution')}
          items={stats?.model_breakdown || []}
          emptyText={t('No Data')}
        />
        <DistributionCard
          title={t('Group Distribution')}
          items={stats?.group_breakdown || []}
          emptyText={t('No Data')}
        />
      </div>
    </div>
  )
}
