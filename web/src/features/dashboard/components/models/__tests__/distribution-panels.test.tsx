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
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'vitest'

import type { UsageBreakdownItem } from '@/features/dashboard/types'
import { useSystemConfigStore } from '@/stores/system-config-store'
import { DistributionPanels } from '../distribution-panels'

const i18n = (await import('i18next')).default
const { I18nextProvider, initReactI18next } = await import('react-i18next')

await i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        Model: 'Model',
        Group: 'Group',
        Requests: 'Requests',
        Token: 'Token',
        Actual: 'Actual',
        'Model Distribution': 'Model Distribution',
        'Group Distribution': 'Group Distribution',
        'Sorted by actual consumption': 'Sorted by actual consumption',
        'Tokens consumed per 1 unit of actual cost':
          'Tokens consumed per 1 unit of actual cost',
        'Token / {{currency}}': 'Token / {{currency}}',
        'No data': 'No data',
        'Unknown': 'Unknown',
        'Ungrouped': 'Ungrouped',
        '+{{count}} more': '+{{count}} more',
      },
    },
  },
})

function setCurrencyDisplay(
  overrides: Record<string, unknown> = {},
  quotaDisplayType: 'USD' | 'CNY' | 'TOKENS' | 'CUSTOM' = 'USD'
) {
  useSystemConfigStore.getState().setConfig({
    currency: {
      quotaDisplayType,
      quotaPerUnit: 500000,
      usdExchangeRate: 7.2,
      customCurrencySymbol: '€',
      customCurrencyExchangeRate: 0.9,
      ...overrides,
    },
  } as never)
}

function renderPanels(
  modelItems: UsageBreakdownItem[],
  groupItems: UsageBreakdownItem[] = []
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <DistributionPanels
        modelItems={modelItems}
        groupItems={groupItems}
        loading={false}
      />
    </I18nextProvider>
  )
}

function modelTable(): HTMLElement {
  return screen.getByRole('table')
}

beforeEach(() => {
  setCurrencyDisplay()
})

describe('distribution panels', () => {
  test('per-currency price renders rounded instead of raw float', () => {
    renderPanels([
      { name: 'gpt-image-2.5-sunburst', count: 28, quota: 3000000, tokens: 28 },
    ])

    const table = modelTable()
    // 28 tokens / $6 = 4.666666666666667 —— 必须被格式化成 4.67
    expect(within(table).getByText('4.67')).toBeInTheDocument()
    expect(table.textContent).not.toContain('4.666666666666667')
  })

  test('large token counts use locale compact units', () => {
    renderPanels([
      { name: 'deepseek', count: 9216, quota: 117750000, tokens: 2349010000 },
    ])

    const table = modelTable()
    expect(within(table).getByText('2.35B')).toBeInTheDocument()
    expect(table.textContent).not.toContain('2349.01M')
  })

  test('zero quota row shows dash for price and amount', () => {
    renderPanels([{ name: 'free-model', count: 1, quota: 0, tokens: 500 }])

    const row = within(modelTable()).getByText('free-model').closest('tr')
    expect(row).not.toBeNull()
    const cells = within(row as HTMLElement).getAllByRole('cell')
    expect(cells[3]).toHaveTextContent('-')
    expect(cells[4]).toHaveTextContent('-')
  })

  test('share percentage covers rows hidden by the 8-row cap', () => {
    const items: UsageBreakdownItem[] = Array.from({ length: 10 }, (_, i) => ({
      name: `model-${i}`,
      count: 1,
      quota: 1000000,
      tokens: 1000,
    }))
    renderPanels(items)

    const table = modelTable()
    // 10 条各占 10%；若分母只算前 8 行会变成 12.5%
    expect(within(table).getAllByText('10%').length).toBeGreaterThan(0)
    expect(table.textContent).not.toContain('12.5%')
    expect(within(table).getByText('+2 more')).toBeInTheDocument()
  })

  test('table has no totals footer row', () => {
    renderPanels([
      { name: 'a', count: 1, quota: 100, tokens: 10 },
      { name: 'b', count: 2, quota: 200, tokens: 20 },
    ])

    expect(modelTable().querySelector('tfoot')).toBeNull()
  })

  test('per-currency column hides when display type is tokens', () => {
    setCurrencyDisplay({}, 'TOKENS')
    renderPanels([{ name: 'a', count: 1, quota: 500000, tokens: 1000 }])

    const headers = within(modelTable()).getAllByRole('columnheader')
    expect(headers.map((h) => h.textContent)).toEqual([
      'Model',
      'Requests',
      'Token',
      'Actual',
    ])
  })

  test('per-currency header follows configured currency label', () => {
    setCurrencyDisplay({}, 'CNY')
    renderPanels([{ name: 'a', count: 1, quota: 500000, tokens: 1000 }])

    expect(
      within(modelTable()).getByRole('columnheader', { name: 'Token / CNY' })
    ).toBeInTheDocument()
  })

  test('empty dimensions are translated instead of leaking sentinels', () => {
    renderPanels(
      [{ name: '__unknown__', count: 1, quota: 100, tokens: 10 }],
      [{ name: '__ungrouped__', count: 1, quota: 100, tokens: 10 }]
    )

    const tables = screen.getAllByRole('table')
    expect(within(tables[0]).getByText('Unknown')).toBeInTheDocument()
    expect(within(tables[1]).getByText('Ungrouped')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('__unknown__')
    expect(document.body.textContent).not.toContain('__ungrouped__')
  })
})
