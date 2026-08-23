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
import { VChart } from '@visactor/react-vchart'
import { Boxes, Layers } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { IconBadge, type IconBadgeTone } from '@/components/ui/icon-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useThemeCustomization } from '@/context/theme-customization-provider'
import { useTheme } from '@/context/theme-provider'
import { getDashboardChartColors } from '@/features/dashboard/lib/charts'
import type { UsageBreakdownItem } from '@/features/dashboard/types'
import { formatQuota } from '@/lib/format'
import { useThemeRadiusPx } from '@/lib/theme-radius'
import { VCHART_OPTION } from '@/lib/vchart'

let themeManagerPromise: Promise<
  (typeof import('@visactor/vchart'))['ThemeManager']
> | null = null

interface DistributionPieProps {
  title: string
  icon: typeof Boxes
  iconTone: IconBadgeTone
  items: UsageBreakdownItem[]
  loading: boolean
}

function buildPieSpec(
  items: UsageBreakdownItem[],
  title: string,
  cornerRadius?: number
): IPieChartSpec {
  const sorted = [...items].sort((a, b) => b.quota - a.quota)
  const values = sorted.map((item) => ({
    type: item.name,
    value: Number(item.quota) || 0,
  }))
  const domain = values.map((item) => item.type)
  const range = getDashboardChartColors(domain.length)

  return {
    type: 'pie',
    data: [{ id: 'distribution', values }],
    outerRadius: 0.8,
    innerRadius: 0.5,
    padAngle: 0.6,
    valueField: 'value',
    categoryField: 'type',
    pie: {
      style: cornerRadius == null ? {} : { cornerRadius },
      state: {
        hover: { outerRadius: 0.85, stroke: '#000', lineWidth: 1 },
        selected: { outerRadius: 0.85, stroke: '#000', lineWidth: 1 },
      },
    },
    title: { visible: true, text: title },
    legends: { visible: true, orient: 'left' },
    label: { visible: true },
    color: { type: 'ordinal', domain, range },
    tooltip: {
      mark: {
        content: [
          {
            key: (datum?: Datum) => String(datum?.type ?? ''),
            value: (datum?: Datum) => formatQuota(Number(datum?.value) || 0),
          },
        ],
      },
    },
    background: { fill: 'transparent' },
    animation: true,
  }
}

function DistributionPie(props: DistributionPieProps) {
  const { t } = useTranslation()
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

  const spec = useMemo(
    () => buildPieSpec(props.items, props.title, chartRadius),
    [props.items, props.title, chartRadius]
  )

  const Icon = props.icon
  const hasData = props.items.length > 0
  const chartKey = [
    props.title,
    props.loading ? 'loading' : 'ready',
    props.items.length,
    resolvedTheme,
    customization.preset,
  ].join('-')

  let content: ReactNode
  if (props.loading) {
    content = <Skeleton className='h-full w-full rounded-md' />
  } else if (themeReady && hasData) {
    content = (
      <VChart
        key={chartKey}
        spec={{
          ...spec,
          theme: resolvedTheme === 'dark' ? 'dark' : 'light',
          background: 'transparent',
        }}
        option={VCHART_OPTION}
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
      <div className='flex items-center gap-2 border-b px-3 py-2 sm:px-5 sm:py-3'>
        <IconBadge tone={props.iconTone} size='sm'>
          <Icon />
        </IconBadge>
        <div className='text-sm font-semibold'>{props.title}</div>
      </div>

      <div className='h-[300px] p-1.5 sm:h-80 sm:p-2'>{content}</div>
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
      <DistributionPie
        title={t('Model Distribution')}
        icon={Boxes}
        iconTone='chart-2'
        items={props.modelItems}
        loading={props.loading}
      />
      <DistributionPie
        title={t('Group Distribution')}
        icon={Layers}
        iconTone='chart-3'
        items={props.groupItems}
        loading={props.loading}
      />
    </div>
  )
}
