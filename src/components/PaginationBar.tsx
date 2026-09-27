import { Group, Pagination, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function PaginationBar({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation('admin');
  if (total === 0) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <Group justify="space-between" mt="md" gap="sm">
      <Text size="sm" c="dimmed">
        {t('pagination.summary', { from, to, total })}
      </Text>
      {pages > 1 && <Pagination value={page} total={pages} onChange={onChange} size="sm" />}
    </Group>
  );
}
