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
import { ExternalLink, ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { TitledCard } from '@/components/ui/titled-card'

interface ShopPurchaseCardProps {
  /** 链动小铺购买页 URL；为空时不渲染卡片 */
  shopUrl?: string
}

export function ShopPurchaseCard({ shopUrl }: ShopPurchaseCardProps) {
  const { t } = useTranslation()

  if (!shopUrl) {
    return null
  }

  return (
    <TitledCard
      title={t('Purchase Redemption Code')}
      description={t('Buy a redemption code from the embedded shop')}
      icon={<ShoppingCart className='h-4 w-4' />}
      iconTone='warning'
      disableHoverEffect
      action={
        <a
          href={shopUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline'
        >
          {t('Open in new tab')}
          <ExternalLink className='h-3 w-3' />
        </a>
      }
      contentClassName='p-0 sm:p-0'
    >
      <iframe
        src={shopUrl}
        title={t('Purchase Redemption Code')}
        loading='lazy'
        scrolling='no'
        className='h-[calc(120vh-13.2rem)] min-h-[32rem] w-full border-0 bg-background'
        sandbox='allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts'
        referrerPolicy='no-referrer'
      />
    </TitledCard>
  )
}
