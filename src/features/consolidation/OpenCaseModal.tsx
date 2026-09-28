import { Button, Group, Select, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { casesApi, type CaseDetail } from '../../api/consolidation';
import { ApiError } from '../../api/http';
import { FormError } from '../../components/FormError';
import { AnchorLink } from '../../components/links';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { fullName } from '../people/format';
import { consolidatorsQuery } from './steps';
import { PersonPicker, type PersonOption } from '../people/PersonPicker';

function OpenCaseForm({
  canAssign,
  person: initialPerson,
  onClose,
  onOpened,
}: {
  canAssign: boolean;
  person?: PersonOption | null;
  onClose: () => void;
  onOpened: (c: CaseDetail) => void;
}) {
  const { t } = useTranslation(['consolidation', 'common']);
  const [person, setPerson] = useState<PersonOption | null>(initialPerson ?? null);
  const [consolidator, setConsolidator] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const consolidators = useQuery({ ...consolidatorsQuery(), enabled: canAssign });
  const existing =
    error instanceof ApiError && error.code === 'CASE_ALREADY_OPEN'
      ? ((error.details as { caseId?: number } | undefined)?.caseId ?? null)
      : null;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!person) return;
        setBusy(true);
        setError(null);
        try {
          onOpened(
            await casesApi.open({
              personId: person.id,
              ...(consolidator ? { consolidatorUserId: Number(consolidator) } : {}),
            }),
          );
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        {existing && (
          <AnchorLink
            to="/consolidacion/$caseId"
            params={{ caseId: String(existing) }}
            size="sm"
            onClick={onClose}
          >
            {t('cases.openExisting')}
          </AnchorLink>
        )}
        {!initialPerson && (
          <PersonPicker
            label={t('cases.person')}
            placeholder={t('cases.searchPerson')}
            value={person}
            onChange={setPerson}
            required
            data-autofocus
          />
        )}
        {initialPerson && <Text fw={500}>{fullName(initialPerson)}</Text>}
        {canAssign && (
          <Select
            label={t('cases.consolidator')}
            placeholder={t('board.unassigned')}
            data={(consolidators.data ?? []).map((u) => ({ value: String(u.id), label: fullName(u) }))}
            value={consolidator}
            onChange={setConsolidator}
            clearable
            searchable
          />
        )}
        <Text size="xs" c="dimmed">
          {t('cases.openHint')}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!person}>
            {t('cases.open')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function OpenCaseModal({
  opened,
  canAssign,
  person,
  onClose,
  onOpened,
}: {
  opened: boolean;
  canAssign: boolean;
  /** Abrir para una persona ya elegida (desde su ficha). */
  person?: PersonOption | null;
  onClose: () => void;
  onOpened: (c: CaseDetail) => void;
}) {
  const { t } = useTranslation('consolidation');
  return (
    <ResponsiveModal opened={opened} onClose={onClose} title={t('cases.openTitle')} size="md">
      {opened && <OpenCaseForm canAssign={canAssign} person={person} onClose={onClose} onOpened={onOpened} />}
    </ResponsiveModal>
  );
}
