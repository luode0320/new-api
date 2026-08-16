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
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

const schema = z.object({
  enabled: z.boolean(),
  tiers: z.array(z.number().positive()).min(1),
})

type Values = z.infer<typeof schema>

export function RedemptionSettingsSection({
  defaultValues,
}: {
  defaultValues: {
    enabled: boolean
    tiers: number[]
  }
}) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [newTier, setNewTier] = useState('')

  const form = useForm<Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
    defaultValues: {
      enabled: defaultValues.enabled,
      tiers: defaultValues.tiers,
    },
  })

  const { isDirty, isSubmitting } = form.formState
  const tiers = form.watch('tiers')

  function handleAddTier() {
    const tier = Number(newTier)
    if (!Number.isFinite(tier) || tier <= 0) {
      return
    }

    form.setValue('tiers', [...tiers, tier], { shouldDirty: true })
    setNewTier('')
  }

  function handleRemoveTier(index: number) {
    form.setValue(
      'tiers',
      tiers.filter((_, i) => i !== index),
      { shouldDirty: true }
    )
  }

  async function onSubmit(values: Values) {
    const updates: Array<{ key: string; value: string }> = []

    if (values.enabled !== defaultValues.enabled) {
      updates.push({
        key: 'redemption_setting.enable_redemption',
        value: String(values.enabled),
      })
    }

    if (values.tiers !== defaultValues.tiers) {
      updates.push({
        key: 'redemption_setting.redemption_tiers',
        value: JSON.stringify(values.tiers),
      })
    }

    if (updates.length === 0) {
      toast.info(t('No changes to save'))
      return
    }

    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }

    form.reset(values)
  }

  return (
    <SettingsSection title={t('Redemption Settings')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)} autoComplete='off'>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending || isSubmitting}
            isSaveDisabled={!isDirty}
            saveLabel='Save redemption settings'
          />
          <FormField
            control={form.control}
            name='enabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Enable redemption codes')}</FormLabel>
                  <FormDescription>
                    {t(
                      'Allow users to redeem codes purchased from external shops for quota'
                    )}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={updateOption.isPending || isSubmitting}
                  />
                </FormControl>
              </SettingsSwitchItem>
            )}
          />

          <FormField
            control={form.control}
            name='tiers'
            render={() => (
              <FormItem>
                <FormLabel>{t('Face-value tiers')}</FormLabel>
                <FormDescription>
                  {t(
                    'Preset code amounts in currency shown as quick-select buttons when creating redemption codes'
                  )}
                </FormDescription>
                <div className='flex flex-wrap items-center gap-2'>
                  {tiers.map((tier, index) => (
                    <div
                      key={`${tier}-${index}`}
                      className='flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm'
                    >
                      <span>{tier}</span>
                      <button
                        type='button'
                        className='text-muted-foreground hover:text-foreground'
                        aria-label={t('Remove tier')}
                        onClick={() => handleRemoveTier(index)}
                      >
                        <X className='size-3.5' />
                      </button>
                    </div>
                  ))}
                </div>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min={0}
                    step='any'
                    value={newTier}
                    placeholder={t('10')}
                    className='w-32'
                    onChange={(event) => setNewTier(event.target.value)}
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleAddTier}
                  >
                    <Plus className='size-4' />
                    {t('Add tier')}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
