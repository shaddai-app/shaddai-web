import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { platformApi, type Plan } from '../../../../api/platform';
import { FormError } from '../../../../components/FormError';
import { ResponsiveModal } from '../../../../components/ResponsiveModal';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_platform/plataforma/planes')({ component: PlansPage });

const schema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'required')
    .regex(/^[a-z0-9_-]+$/, 'slug')
    .max(30),
  name: z.string().trim().min(1, 'required').max(80),
  userLimit: z.number().int().min(1),
  storageLimitMb: z.number().int().min(0),
  priceUsd: z.number().min(0),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

function PlanForm({ plan, onDone }: { plan: Plan | null; onDone: () => void }) {
  const { t } = useTranslation(['platform', 'common', 'errors']);
  const queryClient = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: plan
      ? { ...plan, priceUsd: Number(plan.priceUsd) }
      : { code: '', name: '', userLimit: 10, storageLimitMb: 1024, priceUsd: 0, isActive: true },
  });

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      if (plan) {
        const { code: _code, ...rest } = v; // el código identifica al plan y no se cambia
        await platformApi.updatePlan(plan.id, rest);
      } else {
        await platformApi.createPlan(v);
      }
      await queryClient.invalidateQueries({ queryKey: ['platform', 'plans'] });
      notifications.show({ color: 'teal', message: t('plans.saved') });
      onDone();
    } catch (err) {
      setError(err);
    }
  });

  const msg = (name: keyof Values) => {
    const m = form.formState.errors[name]?.message;
    return m ? t(`errors:validation.${m}` as never) : undefined;
  };
  const num = (name: 'userLimit' | 'storageLimitMb' | 'priceUsd', label: string, extra = {}) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <NumberInput
          label={label}
          min={0}
          value={field.value}
          onChange={(v) => field.onChange(Number(v) || 0)}
          {...extra}
        />
      )}
    />
  );

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <FormError error={error} />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label={t('plans.code')}
            disabled={Boolean(plan)}
            error={msg('code')}
            {...form.register('code')}
          />
          <TextInput label={t('plans.name')} error={msg('name')} {...form.register('name')} />
          {num('userLimit', t('plans.userLimit'), { min: 1 })}
          {num('storageLimitMb', t('plans.storageLimitMb'))}
          {num('priceUsd', t('plans.priceUsd'), { decimalScale: 2, prefix: 'US$ ' })}
        </SimpleGrid>
        <Switch label={t('plans.active')} {...form.register('isActive')} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onDone}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

function PlansPage() {
  const { t } = useTranslation('platform');
  const plans = useQuery({ queryKey: ['platform', 'plans'], queryFn: platformApi.plans });
  const [editing, setEditing] = useState<Plan | 'new' | null>(null);

  return (
    <>
      <PageHeader
        title={t('plans.title')}
        description={t('plans.description')}
        actions={
          <Button leftSection={<IconPlus size={18} />} onClick={() => setEditing('new')}>
            {t('plans.add')}
          </Button>
        }
      />
      <FormError error={plans.error} />
      {plans.isPending ? (
        <Loader />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {plans.data?.items.map((p) => (
            <Card key={p.id} withBorder radius="lg" padding="lg" opacity={p.isActive ? 1 : 0.6}>
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={600}>{p.name}</Text>
                  <Text size="xs" c="dimmed">
                    {p.code}
                  </Text>
                </div>
                <Button
                  size="xs"
                  variant="subtle"
                  leftSection={<IconPencil size={14} />}
                  onClick={() => setEditing(p)}
                >
                  {t('plans.edit')}
                </Button>
              </Group>
              <Text fz={26} fw={700} mt="sm">
                US$ {Number(p.priceUsd).toFixed(2)}
              </Text>
              <Group gap="xs" mt="sm">
                <Badge variant="light">
                  {p.userLimit} {t('plans.userLimit').toLowerCase()}
                </Badge>
                <Badge variant="light" color="gray">
                  {p.storageLimitMb} MB
                </Badge>
                {!p.isActive && (
                  <Badge variant="light" color="red">
                    {t('plans.inactive')}
                  </Badge>
                )}
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}
      <ResponsiveModal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        size="md"
        title={editing === 'new' ? t('plans.createTitle') : t('plans.editTitle')}
      >
        {editing !== null && (
          <PlanForm
            key={editing === 'new' ? 'new' : editing.id}
            plan={editing === 'new' ? null : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </ResponsiveModal>
    </>
  );
}
