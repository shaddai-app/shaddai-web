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
      // startsAt: hora local de la iglesia ("2026-10-04T10:00"); dueAt/date: día ("2026-10-04").
      const day = p.dueAt ?? p.date;
      const date =
        typeof p.startsAt === 'string'
          ? dayjs(p.startsAt).format('ddd L LT')
          : typeof day === 'string'
            ? dayjs(day).format('L')
            : '';
      // prayer.public y prayer.reply sin nombre: alguien del formulario que no lo dejó.
      const person = n.type === 'prayer.reply' && !p.person ? t('types.prayer.reply.requester') : p.person;
      const values = { ...p, person, date };
      const title =
        n.type === 'prayer.public' && !p.name
          ? t('types.prayer.public.titleNoName')
          : t(`types.${n.type}.title`, values);
      const body = [
        n.type === 'prayer.request' && p.visibility === 'pastors'
          ? t('types.prayer.request.bodyPastors', values)
          : n.type === 'prayer.reply' && p.mine
            ? t('types.prayer.reply.bodyMine', values)
            : t(`types.${n.type}.body`, values),
        ...(n.type === 'prayer.public' && p.wantsContact ? [t('types.prayer.public.wantsContact')] : []),
        ...(n.type === 'assignment.declined' && p.reason ? [t('reason', { reason: p.reason })] : []),
        ...(n.type === 'consolidation.overdue' && p.unassigned
          ? [t('types.consolidation.overdue.unassigned')]
          : []),
      ];
      return { title, body: body.join(' ') };
    },
    [t],
  );
}

/** "hace 5 minutos" (en el idioma de dayjs); con fecha si pasó más de una semana. */
export function when(iso: string) {
  const d = dayjs(iso);
  return dayjs().diff(d, 'day') < 7 ? d.fromNow() : d.format('L');
}
