import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { AccountStatus } from '../../api/platform';

const COLORS: Record<AccountStatus, string> = {
  trial: 'blue',
  active: 'teal',
  past_due: 'yellow',
  suspended: 'red',
  closed: 'gray',
};

export function StatusBadge({ status, size = 'sm' }: { status: AccountStatus; size?: 'sm' | 'md' | 'lg' }) {
  const { t } = useTranslation('platform');
  return (
    <Badge color={COLORS[status]} variant="light" size={size}>
      {t(`status.${status}`)}
    </Badge>
  );
}
