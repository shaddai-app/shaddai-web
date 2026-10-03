import { Alert, Box, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { landingApi, type PublicPlan } from '../../api/landing';
import { useMoney } from '../finance/common';
import classes from './landing.module.css';

/** Días de prueba cuando todavía no llegaron los planes (el mismo valor por defecto del alta). */
const DEFAULT_TRIAL_DAYS = 30;

function Feature({ children }: { children: string }) {
  return (
    <Group gap={8} wrap="nowrap" align="flex-start">
      <IconCheck size={18} className={classes.check} aria-hidden />
      <Text size="sm">{children}</Text>
    </Group>
  );
}

function PlanCard({ plan }: { plan: PublicPlan }) {
  const { t, i18n } = useTranslation('landing');
  const money = useMoney();
  const lang = i18n.resolvedLanguage ?? 'es';
  const gb = new Intl.NumberFormat(lang === 'es' ? 'es-AR' : lang, {
    style: 'unit',
    unit: plan.storageLimitMb >= 1024 ? 'gigabyte' : 'megabyte',
    maximumFractionDigits: 1,
  }).format(plan.storageLimitMb >= 1024 ? plan.storageLimitMb / 1024 : plan.storageLimitMb);

  return (
    <Box className={classes.card} p="xl">
      <Stack gap="md">
        <Title order={3} size="h3">
          {plan.name}
        </Title>
        {plan.priceArs !== null ? (
          <div>
            <Text className={classes.price}>{money(plan.priceArs, 'ARS', { whole: true })}</Text>
            <Text size="sm" c="dimmed">
              {t('pricing.perMonth')}
            </Text>
          </div>
        ) : (
          <Text className={classes.price} c="var(--sh-texto-2)" fz={26}>
            {t('pricing.noPrice')}
          </Text>
        )}
        <Stack gap={8}>
          <Feature>{t('pricing.users', { count: plan.userLimit })}</Feature>
          <Feature>{t('pricing.storage', { size: gb })}</Feature>
          <Feature>{t('pricing.unlimitedPeople')}</Feature>
          <Feature>{t('pricing.allModules')}</Feature>
        </Stack>
      </Stack>
    </Box>
  );
}

/** Planes activos, leídos de la base (sin precio → "Precio a definir"). */
export function PlansSection() {
  const { t } = useTranslation('landing');
  const plans = useQuery({ queryKey: ['public', 'plans'], queryFn: landingApi.plans, retry: 1 });
  const trialDays = plans.data?.trialDays ?? DEFAULT_TRIAL_DAYS;

  return (
    <Stack gap="xl">
      <Stack gap="sm" maw={720}>
        <Text className={classes.eyebrow}>{t('pricing.eyebrow')}</Text>
        <h2 className={classes.h2}>{t('pricing.title')}</h2>
        <div className={classes.titleLine} aria-hidden />
        <Text className={classes.lead}>{t('pricing.subtitle', { count: trialDays })}</Text>
      </Stack>
      {plans.isPending ? (
        <Loader aria-label={t('pricing.title')} />
      ) : plans.isError ? (
        <Alert color="gray">{t('pricing.error')}</Alert>
      ) : plans.data.items.length === 0 ? (
        <Alert color="gray">{t('pricing.empty')}</Alert>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: Math.min(plans.data.items.length, 3) }} spacing="lg">
          {plans.data.items.map((plan) => (
            <PlanCard key={plan.code} plan={plan} />
          ))}
        </SimpleGrid>
      )}
      <Text size="sm" c="dimmed">
        {t('pricing.note')}
      </Text>
    </Stack>
  );
}
