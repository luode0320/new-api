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
along with this program. If not, see <http://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { SubscriptionOverwriteConfirmDialog } from '../components/dialogs/subscription-overwrite-confirm-dialog'
import type { PlanRecord, UserSubscriptionRecord } from '../types'

const plan: PlanRecord = {
  plan: {
    id: 2,
    title: 'Basic 1h',
    subtitle: '',
    price_amount: 1,
    currency: 'USD',
    duration_unit: 'hour',
    duration_value: 1,
    quota_reset_period: 'never',
    enabled: true,
    sort_order: 1,
    max_purchase_per_user: 0,
    total_amount: 0,
    upgrade_group: 'basic',
    allow_balance_pay: true,
    allow_wallet_overflow: true,
  },
}

const activeSubscriptions: UserSubscriptionRecord[] = [
  {
    subscription: {
      id: 4,
      user_id: 1,
      plan_id: 1,
      status: 'active',
      start_time: 1761600000,
      end_time: 1761686400,
      amount_total: 0,
      amount_used: 0,
    },
  },
]

const planTitleMap = new Map<number, string>([[1, 'Top 1h']])

describe('SubscriptionOverwriteConfirmDialog', () => {
  beforeEach(() => {
    useAuthStore.setState({
      auth: {
        ...useAuthStore.getState().auth,
        user: { id: 1, username: 'tester', role: 1, group: 'top' },
      },
    })
  })

  test('lists active subscriptions and the group that will be overwritten', () => {
    render(
      <SubscriptionOverwriteConfirmDialog
        open
        onOpenChange={vi.fn()}
        plan={plan}
        activeSubscriptions={activeSubscriptions}
        planTitleMap={planTitleMap}
        onConfirm={vi.fn()}
      />
    )

    expect(
      screen.getByText('You already have an active subscription')
    ).toBeTruthy()
    expect(screen.getByText('Top 1h · Subscription #4')).toBeTruthy()
    expect(screen.getByText('top')).toBeTruthy()
    expect(screen.getByText('basic')).toBeTruthy()
    expect(
      screen.getByText(
        'After overwriting, your API keys using the "top" group will stop working immediately.'
      )
    ).toBeTruthy()
  })

  test('does not confirm when the dialog is dismissed', async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <SubscriptionOverwriteConfirmDialog
        open
        onOpenChange={onOpenChange}
        plan={plan}
        activeSubscriptions={activeSubscriptions}
        planTitleMap={planTitleMap}
        onConfirm={onConfirm}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  test('confirms the overwrite through the keyboard-accessible slider', () => {
    vi.useFakeTimers()
    const onConfirm = vi.fn()
    render(
      <SubscriptionOverwriteConfirmDialog
        open
        onOpenChange={vi.fn()}
        plan={plan}
        activeSubscriptions={activeSubscriptions}
        planTitleMap={planTitleMap}
        onConfirm={onConfirm}
      />
    )

    const slider = screen.getByRole('button', {
      name: 'Slide to confirm overwrite',
    })
    fireEvent.keyDown(slider, { key: 'Enter' })

    expect(onConfirm).not.toHaveBeenCalled()
    vi.advanceTimersByTime(600)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
