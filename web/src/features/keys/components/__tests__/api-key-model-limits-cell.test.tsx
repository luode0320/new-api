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
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { ApiKey } from '../../types'
import { ModelLimitsCell } from '../api-key-model-limits-cell'

const { getGroupAvailableModels, copyToClipboard } = vi.hoisted(() => ({
  getGroupAvailableModels: vi.fn(async () => [] as string[]),
  copyToClipboard: vi.fn(async () => true),
}))

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>()
  return { ...actual, getGroupAvailableModels }
})

vi.mock('@/lib/copy-to-clipboard', () => ({ copyToClipboard }))

const baseApiKey: ApiKey = {
  id: 1,
  name: 'test',
  key: 'sk-test',
  status: 1,
  remain_quota: 0,
  used_quota: 0,
  unlimited_quota: true,
  expired_time: -1,
  created_time: 1,
  accessed_time: 0,
  group: '订阅分组',
  auto_groups: null,
  cross_group_retry: true,
  model_limits_enabled: false,
  model_limits: '',
  allow_ips: '',
}

function renderCell(apiKey: ApiKey): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Wrapper(props: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {props.children}
      </QueryClientProvider>
    )
  }

  return render(<ModelLimitsCell apiKey={apiKey} />, { wrapper: Wrapper })
}

async function openPopover(label: RegExp) {
  const trigger = screen.getByRole('button', { name: label })
  fireEvent.click(trigger)
  return trigger
}

describe('API key model column', () => {
  beforeEach(() => {
    getGroupAvailableModels.mockClear()
    copyToClipboard.mockClear()
  })

  test('lists the models enabled for the key group when no limit is set', async () => {
    getGroupAvailableModels.mockResolvedValueOnce(['deepseek-chat', 'gpt-4o'])
    renderCell(baseApiKey)

    await openPopover(/Unlimited/)

    expect(await screen.findByText('deepseek-chat')).toBeInTheDocument()
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
    expect(getGroupAvailableModels).toHaveBeenCalledWith('订阅分组')
  })

  test('lists only the configured limits when the key restricts models', async () => {
    renderCell({
      ...baseApiKey,
      model_limits_enabled: true,
      model_limits: 'deepseek-reasoner,gemini-2.5-pro',
    })

    await openPopover(/models/)

    expect(await screen.findByText('deepseek-reasoner')).toBeInTheDocument()
    expect(screen.getByText('gemini-2.5-pro')).toBeInTheDocument()
    expect(getGroupAvailableModels).not.toHaveBeenCalled()
  })

  test('copies a model name when its row is clicked', async () => {
    renderCell({
      ...baseApiKey,
      model_limits_enabled: true,
      model_limits: 'deepseek-chat',
    })

    await openPopover(/models/)
    const row = (await screen.findByText('deepseek-chat')).closest('button')
    if (!row) throw new Error('model row not found')
    fireEvent.click(row)

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledWith('deepseek-chat')
    })
    expect(row).toHaveAccessibleName('Copied: deepseek-chat')
  })

  test('shows an empty state when the group exposes no models', async () => {
    getGroupAvailableModels.mockResolvedValueOnce([])
    renderCell(baseApiKey)

    await openPopover(/Unlimited/)

    expect(await screen.findByText('No models found')).toBeInTheDocument()
  })
})
