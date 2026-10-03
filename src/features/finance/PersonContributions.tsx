import { Button, Card, Group, Loader, Select, Stack, Text } from '@mantine/core';
import { IconFileCertificate } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reportsApi } from '../../api/finance';
import { FormError } from '../../components/FormError';
import { UnstyledLink } from '../../components/links';
import { formatDate, todayIso } from '../people/format';
import { useCategoryLabel, useMoney } from './common';
import { useDownload } from './download';

/** Pestaña "Aportes" de la ficha: lo que dio la persona en el año y la constancia anual en PDF. */
export function ContributionsTab({
  person,
}: {
  person: { id: number; firstName: string; lastName: string };
}) {
  const { t } = useTranslation('finance');
  const money = useMoney();
  const categoryLabel = useCategoryLabel();
  const { busy, run } = useDownload();
  const [year, setYear] = useState(Number(todayIso().slice(0, 4)));
  const data = useQuery({
    queryKey: ['finance', 'person-contributions', person.id, year],
    queryFn: () => reportsApi.personContributions(person.id, year),
    placeholderData: keepPreviousData,
  });
  const slug = `${person.lastName}-${person.firstName}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // sin tildes: "pérez" → "perez"
    .replace(/[^a-z0-9]+/g, '-');

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <Select
          label={t('reports.year')}
          data={(data.data?.years ?? [year]).map(String)}
          value={String(year)}
          onChange={(v) => v && setYear(Number(v))}
          allowDeselect={false}
          w={110}
        />
        <Button
          variant="default"
          leftSection={<IconFileCertificate size={16} />}
          loading={busy === 'certificate'}
          disabled={!data.data?.movements.length}
          onClick={() =>
            void run(
              'certificate',
              (lang) => reportsApi.certificate(person.id, year, lang),
              `${t('reports.files.certificate')}-${year}-${slug}.pdf`,
            )
          }
        >
          {t('reports.certificate')}
        </Button>
      </Group>
      <FormError error={data.error} />
      {data.isPending ? (
        <Loader />
      ) : (
        data.data &&
        (data.data.movements.length === 0 ? (
          <Text c="dimmed">{t('reports.noContributions', { year })}</Text>
        ) : (
          <>
            <Group gap="lg">
              {data.data.totals.map((tot) => (
                <div key={tot.currency}>
                  <Text size="xs" c="dimmed">
                    {t('reports.totalYear', { year, currency: tot.currency })}
                  </Text>
                  <Text fw={700} size="lg" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {money(tot.total, tot.currency)}
                  </Text>
                </div>
              ))}
            </Group>
            <Card withBorder radius="lg" p={0}>
              {data.data.movements.map((m) => (
                <UnstyledLink
                  key={m.id}
                  to="/finanzas/movimientos/$id"
                  params={{ id: String(m.id) }}
                  px="md"
                  py="sm"
                  style={{ display: 'block', borderBottom: '1px solid var(--mantine-color-default-border)' }}
                >
                  <Group justify="space-between" wrap="nowrap" gap="sm">
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>
                        {categoryLabel(m.category)}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {[
                          formatDate(m.date),
                          m.paymentMethod && t(`methods.${m.paymentMethod}`),
                          m.financeAccount.name,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </div>
                    <Text size="sm" fw={600} c="teal" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {money(m.amount, m.financeAccount.currency)}
                    </Text>
                  </Group>
                </UnstyledLink>
              ))}
            </Card>
          </>
        ))
      )}
    </Stack>
  );
}
