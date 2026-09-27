import { Group, Select, Text, type SelectProps } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { peopleApi, type PersonListItem } from '../../api/people';
import { fullName } from './format';

type Props = Omit<SelectProps, 'data' | 'value' | 'onChange' | 'searchValue' | 'onSearchChange'> & {
  value: PersonListItem | null;
  onChange: (person: PersonListItem | null) => void;
  /** Ids que no se ofrecen (ej. la misma persona o quienes ya están en la familia). */
  exclude?: number[];
};

/** Select con búsqueda en el servidor (respeta el alcance del usuario). */
export function PersonPicker({ value, onChange, exclude = [], ...props }: Props) {
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search, 300);
  const results = useQuery({
    queryKey: ['people', 'picker', debounced],
    queryFn: () => peopleApi.list({ q: debounced, pageSize: 15 }),
    enabled: debounced.trim().length >= 2,
    placeholderData: keepPreviousData,
  });
  const options = (results.data?.items ?? []).filter((p) => !exclude.includes(p.id));
  const all = value && !options.some((o) => o.id === value.id) ? [value, ...options] : options;
  const byId = new Map(all.map((p) => [String(p.id), p]));

  return (
    <Select
      searchable
      clearable
      // Tocar de nuevo la opción elegida no la quita (para eso está la X).
      allowDeselect={false}
      leftSection={<IconSearch size={16} />}
      filter={({ options: o }) => o} // el filtrado lo hace el servidor
      data={all.map((p) => ({ value: String(p.id), label: fullName(p) }))}
      value={value ? String(value.id) : null}
      onChange={(id) => onChange(id ? (byId.get(id) ?? null) : null)}
      searchValue={search}
      onSearchChange={setSearch}
      nothingFoundMessage={debounced.trim().length >= 2 && !results.isFetching ? '—' : undefined}
      renderOption={({ option }) => {
        const p = byId.get(option.value);
        return (
          <Group gap={6} wrap="nowrap">
            <Text size="sm">{option.label}</Text>
            {p?.phone && (
              <Text size="xs" c="dimmed">
                {p.phone}
              </Text>
            )}
          </Group>
        );
      }}
      comboboxProps={{ withinPortal: true }}
      {...props}
    />
  );
}
