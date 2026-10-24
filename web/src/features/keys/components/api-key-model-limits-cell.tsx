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
import { Check, ChevronDown, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { cn } from '@/lib/utils'

import { getGroupAvailableModels } from '../api'
import type { ApiKey } from '../types'

export function ModelLimitsCell({ apiKey }: { apiKey: ApiKey }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [copiedModel, setCopiedModel] = useState<string | null>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    return () => clearTimeout(copiedTimerRef.current)
  }, [])

  const restricted = apiKey.model_limits_enabled && !!apiKey.model_limits
  const restrictedModels = restricted
    ? (apiKey.model_limits || '').split(',').filter(Boolean)
    : []
  const group = apiKey.group || ''
  const { data: groupModels = [], isLoading } = useQuery({
    queryKey: ['key-available-models', group],
    queryFn: () => getGroupAvailableModels(group),
    enabled: open && !restricted,
    staleTime: 60_000,
  })

  const models = restricted ? restrictedModels : groupModels

  const handleCopy = async (model: string) => {
    const ok = await copyToClipboard(model)
    if (!ok) return

    setCopiedModel(model)
    clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopiedModel(null), 2000)
  }

  let popoverBody: React.ReactNode = null
  if (isLoading) {
    popoverBody = (
      <div className='space-y-1 p-1'>
        {['first', 'second', 'third'].map((key) => (
          <Skeleton key={key} className='h-7 w-full' />
        ))}
      </div>
    )
  } else if (models.length === 0) {
    popoverBody = (
      <p className='text-muted-foreground px-2 py-4 text-center text-xs'>
        {t('No models found')}
      </p>
    )
  } else {
    popoverBody = (
      <div className='max-h-72 overflow-y-auto'>
        {models.map((model) => {
          const copied = copiedModel === model
          return (
            <button
              key={model}
              type='button'
              onClick={() => handleCopy(model)}
              aria-label={`${copied ? t('Copied') : t('Copy model name')}: ${model}`}
              className='hover:bg-accent focus-visible:ring-ring/50 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left focus-visible:ring-[2px] focus-visible:outline-none'
            >
              <span className='min-w-0 flex-1 truncate font-mono text-xs'>
                {model}
              </span>
              {copied ? (
                <Check className='text-success size-3.5 shrink-0' />
              ) : (
                <Copy className='text-muted-foreground size-3.5 shrink-0 opacity-60' />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant='ghost'
            size='sm'
            className='-ml-1.5 h-7 gap-1 px-0 hover:bg-transparent aria-expanded:bg-transparent'
          />
        }
      >
        <StatusBadge
          label={
            restricted
              ? t('{{count}} models', { count: models.length })
              : t('Unlimited')
          }
          variant='neutral'
          copyable={false}
        />
        <ChevronDown
          className={cn(
            'text-muted-foreground size-3.5 shrink-0 transition-transform',
            open && 'rotate-180'
          )}
          aria-hidden='true'
        />
      </PopoverTrigger>
      <PopoverContent className='w-60 p-1' align='start' collisionPadding={12}>
        {popoverBody}
      </PopoverContent>
    </Popover>
  )
}
