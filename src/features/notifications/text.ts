import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { NOTIFICATION_TYPES, type AppNotification, type NotificationType } from '../../api/notifications';

dayjs.extend(relativeTime);

const known = (type: string): type is NotificationType =>
  (NOTIFICATION_TYPES as readonly string[]).includes(type);

/** Título y detalle de un aviso en el idioma del usuario, a partir de su tipo y sus datos. */
export function useNotificationText() {
  const { t } = useTranslation('notifications');
  return useCallback(
    (n: AppNotification) => {
      if (!known(n.type)) return { title: t('types.unknown.title'), body: '' };
      const p = n.params;
      // startsAt es la hora local de la iglesia ("2026-10-04T10:00").
      const date = typeof p.startsAt === 'string' ? dayjs(p.startsAt).format('ddd L LT') : '';
      const values = { ...p, date };
      const body = [
        t(`types.${n.type}.body`, values),
        ...(n.type === 'assignment.declined' && p.reason ? [t('reason', { reason: p.reason })] : []),
      ];
      return { title: t(`types.${n.type}.title`, values), body: body.join(' ') };
    },
    [t],
  );
}

/** "hace 5 minutos" (en el idioma de dayjs); con fecha si pasó más de una semana. */
export function when(iso: string) {
  const d = dayjs(iso);
  return dayjs().diff(d, 'day') < 7 ? d.fromNow() : d.format('L');
}
