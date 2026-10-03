import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { prayerApi, type PrayerRequest } from '../../api/prayer';
import { errorMessage } from '../../i18n/errors';
import { AnswerModal, PrayerFormModal } from './PrayerFormModal';

/** Acciones sobre una petición (nueva, editar, respondida, reabrir, borrar) y sus modales. */
export function usePrayerActions({
  onCreated,
  onDeleted,
}: { onCreated?: (p: PrayerRequest) => void; onDeleted?: () => void } = {}) {
  const { t } = useTranslation(['prayer', 'common']);
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PrayerRequest | null>(null);
  const [answering, setAnswering] = useState<PrayerRequest | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['prayer'] });

  const reopen = async (p: PrayerRequest) => {
    try {
      await prayerApi.update(p.id, { status: 'open' });
      notifications.show({ color: 'teal', message: t('reopened') });
      await refresh();
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  const remove = (p: PrayerRequest) =>
    modals.openConfirmModal({
      title: t('deleteTitle'),
      children: <Text size="sm">{p.mine ? t('deleteBodyMine') : t('deleteBodyModerate')}</Text>,
      labels: { confirm: t('delete'), cancel: t('common:actions.cancel') },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await prayerApi.remove(p.id);
          notifications.show({ color: 'teal', message: t('deleted') });
          onDeleted?.(); // antes de refrescar: el detalle borrado ya no se vuelve a pedir
          await refresh();
        } catch (err) {
          notifications.show({ color: 'red', message: errorMessage(err) });
        }
      },
    });

  const handlers = (p: PrayerRequest) => ({
    onEdit: () => {
      setEditing(p);
      setFormOpen(true);
    },
    onAnswer: () => setAnswering(p),
    onReopen: () => void reopen(p),
    onDelete: () => remove(p),
  });

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const modalsJsx = (
    <>
      <PrayerFormModal
        opened={formOpen}
        request={editing}
        onClose={() => setFormOpen(false)}
        onSaved={async (p) => {
          setFormOpen(false);
          notifications.show({ color: 'teal', message: editing ? t('saved') : t('shared') });
          await refresh();
          if (!editing) onCreated?.(p);
        }}
      />
      <AnswerModal
        request={answering}
        onClose={() => setAnswering(null)}
        onSaved={async () => {
          setAnswering(null);
          notifications.show({ color: 'teal', message: t('answeredSaved') });
          await refresh();
        }}
      />
    </>
  );

  return { openNew, handlers, modals: modalsJsx };
}
