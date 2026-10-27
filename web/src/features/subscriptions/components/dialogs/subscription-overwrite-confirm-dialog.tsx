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
import {
  Alert02Icon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'motion/react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { UserSubscriptionRecord } from '@/features/subscriptions/types'
import { formatTimestamp } from '@/features/subscriptions/lib/format'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import type { PlanRecord } from '../../types'

// 松手判定阈值：拖过 80% 行程才视为确认，避免误触
const CONFIRM_THRESHOLD = 0.8
// 确认后停留时长，让用户看到 ✓ 反馈再关闭弹窗
const CONFIRM_HOLD_MS = 600
// 滑块直径与轨道内边距，用于计算可用行程
const THUMB_SIZE = 40
const TRACK_PADDING = 4

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: PlanRecord | null
  activeSubscriptions: UserSubscriptionRecord[]
  planTitleMap: Map<number, string>
  onConfirm: () => void
}

export function SubscriptionOverwriteConfirmDialog(props: Props) {
  const { t } = useTranslation()
  const plan = props.plan?.plan

  if (!plan) return null

  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={
        <>
          <HugeiconsIcon icon={Alert02Icon} className='text-destructive' />
          {t('You already have an active subscription')}
        </>
      }
      description={t(
        'Continuing will make the new subscription overwrite your current subscription group.'
      )}
      contentClassName='max-sm:w-[calc(100vw-1.5rem)] sm:max-w-md'
      titleClassName='flex items-center gap-2'
      contentHeight='auto'
      bodyClassName='space-y-4'
    >
      {/* 只在打开时挂载，滑动进度与确认态随卸载自然重置 */}
      {props.open && (
        <OverwriteConfirmBody
          plan={plan}
          activeSubscriptions={props.activeSubscriptions}
          planTitleMap={props.planTitleMap}
          onCancel={() => props.onOpenChange(false)}
          onConfirm={props.onConfirm}
        />
      )}
    </Dialog>
  )
}

interface BodyProps {
  plan: NonNullable<PlanRecord['plan']>
  activeSubscriptions: UserSubscriptionRecord[]
  planTitleMap: Map<number, string>
  onCancel: () => void
  onConfirm: () => void
}

function OverwriteConfirmBody(props: BodyProps) {
  const { t } = useTranslation()
  const currentGroup = useAuthStore((state) => state.auth.user?.group) || ''
  const prefersReducedMotion = useReducedMotion()

  const [confirmed, setConfirmed] = useState(false)
  const [travel, setTravel] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  const plan = props.plan
  const nextGroup = plan.upgrade_group || ''
  const groupWillChange = !!nextGroup && nextGroup !== currentGroup

  const x = useMotionValue(0)
  const progress = useTransform(x, [0, Math.max(travel, 1)], [0, 1])
  const fillWidth = useTransform(progress, [0, 1], ['0%', '100%'])
  const labelOpacity = useTransform(progress, [0, 0.55], [1, 0])

  // 轨道宽度随弹窗尺寸变化，用 ResizeObserver 同步可用行程
  useEffect(() => {
    const node = trackRef.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width || 0
      setTravel(
        Math.max(0, width - TRACK_PADDING * 2 - THUMB_SIZE)
      )
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const snapTo = (target: number) => {
    animate(x, target, {
      type: 'spring',
      stiffness: 400,
      damping: 32,
      duration: prefersReducedMotion ? 0 : undefined,
    })
  }

  const finish = () => {
    snapTo(travel)
    setConfirmed(true)
    window.setTimeout(() => {
      props.onConfirm()
    }, CONFIRM_HOLD_MS)
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (confirmed || travel <= 0) return
    const ratio = (info.offset.x + info.velocity.x * 0.08) / travel
    if (ratio < CONFIRM_THRESHOLD) {
      snapTo(0)
      return
    }
    finish()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (confirmed) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    finish()
  }

  let slideLabel = t('Slide to continue')
  if (groupWillChange) {
    slideLabel = t('Slide to confirm overwrite')
  }

  return (
    <div className='space-y-3 sm:space-y-4'>
      <div className='space-y-2'>
        <p className='text-muted-foreground text-xs font-medium'>
          {t('Active subscriptions')}
        </p>
        <div className='divide-y rounded-lg border'>
          {props.activeSubscriptions.map((record) => {
            const subscription = record.subscription
            const title = props.planTitleMap.get(subscription.plan_id) || ''
            return (
              <div
                key={subscription.id}
                className='flex items-center justify-between gap-2 px-3 py-2'
              >
                <span className='min-w-0 flex-1 truncate text-sm'>
                  {title
                    ? `${title} · ${t('Subscription')} #${subscription.id}`
                    : `${t('Subscription')} #${subscription.id}`}
                </span>
                <span className='text-muted-foreground shrink-0 text-xs'>
                  {formatTimestamp(subscription.end_time)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className='space-y-2'>
        <p className='text-muted-foreground text-xs font-medium'>
          {t('This purchase')}
        </p>
        <div className='bg-muted/50 space-y-2 rounded-lg border p-3 text-sm'>
          <div className='flex justify-between gap-2'>
            <span className='text-muted-foreground'>{t('Plan Name')}</span>
            <span className='max-w-[60%] truncate font-medium'>
              {plan.title}
            </span>
          </div>
          <div className='flex justify-between gap-2'>
            <span className='text-muted-foreground'>{t('Amount Due')}</span>
            <span className='text-primary font-bold'>
              ${Number(plan.price_amount || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {nextGroup && (
        <div className='space-y-2'>
          <p className='text-muted-foreground text-xs font-medium'>
            {t('Subscription group')}
          </p>
          <div className='bg-muted/50 space-y-2 rounded-lg border p-3 text-sm'>
            <div className='flex justify-between gap-2'>
              <span className='text-muted-foreground'>{t('Current')}</span>
              <span className='font-medium'>{currentGroup || '-'}</span>
            </div>
            <div className='flex justify-between gap-2'>
              <span className='text-muted-foreground'>
                {t('After overwrite')}
              </span>
              <span className='font-medium'>{nextGroup}</span>
            </div>
          </div>
        </div>
      )}

      {groupWillChange && (
        <Alert variant='destructive'>
          <HugeiconsIcon icon={Alert02Icon} />
          <AlertDescription>
            {t(
              'After overwriting, your API keys using the "{{group}}" group will stop working immediately.',
              { group: currentGroup }
            )}
          </AlertDescription>
        </Alert>
      )}

      <div
        ref={trackRef}
        className='bg-muted relative h-12 overflow-hidden rounded-full border select-none'
      >
        <motion.div
          className='bg-destructive/15 absolute inset-y-0 left-0'
          style={{ width: fillWidth }}
          aria-hidden='true'
        />
        {!confirmed && (
          <motion.span
            className='text-muted-foreground pointer-events-none absolute inset-0 flex items-center justify-center text-sm'
            style={{ opacity: labelOpacity }}
          >
            {slideLabel}
          </motion.span>
        )}
        <motion.div
          drag={confirmed ? false : 'x'}
          dragConstraints={{ left: 0, right: travel }}
          dragElastic={0.02}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{ x }}
          role='button'
          tabIndex={0}
          aria-label={slideLabel}
          aria-disabled={confirmed}
          onKeyDown={handleKeyDown}
          className={cn(
            'absolute top-1 left-1 flex size-10 cursor-grab items-center justify-center rounded-full',
            'bg-background border shadow-sm active:cursor-grabbing',
            'focus-visible:ring-ring focus-visible:ring-3 focus-visible:outline-none',
            confirmed && 'cursor-default'
          )}
        >
          <HugeiconsIcon
            icon={confirmed ? CheckmarkCircle02Icon : ArrowRight02Icon}
            className={cn('size-5', confirmed && 'text-success')}
          />
        </motion.div>
      </div>

      <Button
        variant='outline'
        className='w-full'
        onClick={props.onCancel}
        disabled={confirmed}
      >
        {t('Cancel')}
      </Button>
    </div>
  )
}
