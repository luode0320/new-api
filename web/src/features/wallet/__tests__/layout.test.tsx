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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Wallet } from '../index'

const plans = [
  {
    plan: {
      id: 1,
      title: 'Daily Pass',
      price_amount: 1,
      currency: 'USD',
      duration_unit: 'day' as const,
      duration_value: 1,
      quota_reset_period: 'never' as const,
      enabled: true,
      sort_order: 1,
      max_purchase_per_user: 0,
      total_amount: 0,
    },
  },
  {
    plan: {
      id: 2,
      title: 'Monthly Pass',
      price_amount: 10,
      currency: 'USD',
      duration_unit: 'month' as const,
      duration_value: 1,
      quota_reset_period: 'never' as const,
      enabled: true,
      sort_order: 2,
      max_purchase_per_user: 0,
      total_amount: 0,
    },
  },
]

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    getSelf: vi.fn(async () => ({
      success: true,
      data: { quota: 100, used_quota: 10, request_count: 3 },
    })),
  }
})

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: { price: 1 }, loading: false, error: null }),
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({ currency: null }),
}))

vi.mock('../hooks/use-billing-history', () => ({
  useBillingHistory: () => ({
    records: [],
    total: 0,
    loading: false,
    refreshing: false,
    page: 1,
    pageSize: 10,
    keyword: '',
    setKeyword: vi.fn(),
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('@/features/subscriptions/api', () => ({
  getPublicPlans: vi.fn(async () => ({ success: true, data: plans })),
  getSelfSubscriptionFull: vi.fn(async () => ({
    success: true,
    data: {
      billing_preference: 'subscription_first',
      subscriptions: [],
      all_subscriptions: [],
    },
  })),
  updateBillingPreference: vi.fn(async () => ({ success: true, data: {} })),
}))

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>()
  return {
    ...actual,
    getTopupInfo: vi.fn(async () => ({
      success: true,
      data: {
        enable_online_topup: false,
        pay_methods: [],
        amount_options: [],
        enable_redemption: true,
      },
    })),
  }
})

function renderWallet(): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  function Wrapper(props: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {props.children}
      </QueryClientProvider>
    )
  }

  return render(<Wallet />, { wrapper: Wrapper })
}

function cardRoot(heading: HTMLElement): HTMLElement {
  const card = heading.closest('.group\\/card')
  if (!card) throw new Error('card root not found')
  return card as HTMLElement
}

describe('wallet page layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders subscription plans above add funds inside one page column', async () => {
    renderWallet()

    const plansCard = cardRoot(await screen.findByText('Subscription Plans'))
    const addFundsCard = cardRoot(screen.getByText('Add Funds'))

    const column = plansCard.closest('.max-w-7xl')
    expect(column).not.toBeNull()
    expect(column?.className).toContain('flex-col')
    expect(column?.className).not.toContain('grid')
    expect(column?.contains(addFundsCard)).toBe(true)
    expect(
      plansCard.compareDocumentPosition(addFundsCard) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  test('renders add funds below the statistics card', async () => {
    renderWallet()

    const statsLabel = await screen.findByText('Current Balance')
    const addFundsHeading = screen.getByText('Add Funds')

    expect(
      statsLabel.compareDocumentPosition(addFundsHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  test('lays out every offered plan in one auto-fit grid row', async () => {
    renderWallet()

    const dailyPassCard = cardRoot(await screen.findByText('Daily Pass'))
    const monthlyPassCard = cardRoot(screen.getByText('Monthly Pass'))

    const grid = dailyPassCard.parentElement
    expect(grid).toBe(monthlyPassCard.parentElement)
    expect(grid?.className).toContain(
      'sm:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]'
    )
  })

  test('keeps my subscriptions inside the plans card header', async () => {
    renderWallet()

    const entry = (await screen.findByText('My Subscriptions')).closest(
      'button'
    )
    const plansCard = cardRoot(screen.getByText('Subscription Plans'))
    const header = plansCard.querySelector('[data-slot="card-header"]')

    expect(entry).not.toBeNull()
    expect(header).not.toBeNull()
    expect(header?.contains(entry)).toBe(true)
    expect(entry).toHaveAttribute('aria-haspopup', 'dialog')
  })

  test('keeps explanatory copy out of the plans card header', async () => {
    renderWallet()

    const plansCard = cardRoot(await screen.findByText('Subscription Plans'))
    const header = plansCard.querySelector('[data-slot="card-header"]')

    expect(
      screen.queryByText('Subscribe to a plan for model access')
    ).toBeNull()
    expect(screen.queryByText(/Preference saved as/)).toBeNull()

    const warningHint = screen.getByLabelText(/Preference saved as/)
    expect(header?.contains(warningHint)).toBe(true)
  })

  test('opens the subscription details dialog from the header entry', async () => {
    renderWallet()

    const entry = (await screen.findByText('My Subscriptions')).closest(
      'button'
    )
    fireEvent.click(entry as HTMLElement)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('No subscription records')).toBeInTheDocument()
  })
})
