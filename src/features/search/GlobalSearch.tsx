import { ActionIcon, Group, Kbd, Loader, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { Spotlight, spotlight } from '@mantine/spotlight';
import { IconHome, IconSearch, IconUser } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchApi } from '../../api/people';
import { fullName } from '../people/format';
import { PersonAvatar, StatusBadge } from '../people/PersonBits';
import classes from './GlobalSearch.module.css';

/** Botón del header (lupa en celular, campo en escritorio) que abre la búsqueda. */
export function SearchTrigger() {
  const { t } = useTranslation('people');
  return (
    <>
      <UnstyledButton className={classes.trigger} onClick={() => spotlight.open()} visibleFrom="sm">
        <Group gap={8} wrap="nowrap">
          <IconSearch size={16} />
          <Text size="sm" c="dimmed">
            {t('search.button')}
          </Text>
          <Kbd size="xs" ml="auto">
            Ctrl K
          </Kbd>
        </Group>
      </UnstyledButton>
      <Tooltip label={t('search.button')}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          aria-label={t('search.button')}
          onClick={() => spotlight.open()}
          hiddenFrom="sm"
        >
          <IconSearch size={20} />
        </ActionIcon>
      </Tooltip>
    </>
  );
}

/** Búsqueda global (Ctrl+K): personas, familias y usuarios según permisos. */
export function GlobalSearch() {
  const { t } = useTranslation('people');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced] = useDebouncedValue(query.trim(), 250);
  const enabled = debounced.length >= 2;
  const results = useQuery({
    queryKey: ['search', debounced],
    queryFn: ({ signal }) => searchApi.search(debounced, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
  const data = enabled ? results.data : undefined;
  const total = data ? data.people.length + data.households.length + data.users.length : 0;

  return (
    <Spotlight.Root
      query={query}
      onQueryChange={setQuery}
      shortcut={['mod + K', '/']}
      scrollable
      maxHeight={420}
      onSpotlightClose={() => setQuery('')}
    >
      <Spotlight.Search
        placeholder={t('search.placeholder')}
        leftSection={results.isFetching && enabled ? <Loader size={16} /> : <IconSearch size={18} />}
      />
      <Spotlight.ActionsList>
        {!enabled ? (
          <Spotlight.Empty>{t('search.hint')}</Spotlight.Empty>
        ) : data && total === 0 ? (
          <Spotlight.Empty>{t('search.nothing')}</Spotlight.Empty>
        ) : (
          data && (
            <>
              {data.people.length > 0 && (
                <Spotlight.ActionsGroup label={t('search.groups.people')}>
                  {data.people.map((p) => (
                    <Spotlight.Action
                      key={`p${p.id}`}
                      onClick={() => void navigate({ to: '/personas/$id', params: { id: String(p.id) } })}
                    >
                      <Group wrap="nowrap" w="100%">
                        <PersonAvatar person={p} size={30} />
                        <Text size="sm" style={{ flex: 1 }}>
                          {fullName(p)}
                          {p.preferredName ? (
                            <Text span c="dimmed" size="xs">
                              {' '}
                              «{p.preferredName}»
                            </Text>
                          ) : null}
                        </Text>
                        <StatusBadge status={p.status} size="xs" />
                      </Group>
                    </Spotlight.Action>
                  ))}
                </Spotlight.ActionsGroup>
              )}
              {data.households.length > 0 && (
                <Spotlight.ActionsGroup label={t('search.groups.households')}>
                  {data.households.map((h) => (
                    <Spotlight.Action
                      key={`h${h.id}`}
                      leftSection={<IconHome size={18} />}
                      label={h.name}
                      description={h.city ?? undefined}
                      onClick={() => void navigate({ to: '/familias/$id', params: { id: String(h.id) } })}
                    />
                  ))}
                </Spotlight.ActionsGroup>
              )}
              {data.users.length > 0 && (
                <Spotlight.ActionsGroup label={t('search.groups.users')}>
                  {data.users.map((u) => (
                    <Spotlight.Action
                      key={`u${u.id}`}
                      leftSection={<IconUser size={18} />}
                      label={fullName(u)}
                      description={u.email}
                      onClick={() => void navigate({ to: '/admin/usuarios', search: { q: u.email } })}
                    />
                  ))}
                </Spotlight.ActionsGroup>
              )}
            </>
          )
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  );
}
