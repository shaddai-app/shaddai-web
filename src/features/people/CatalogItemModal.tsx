import { Button, ColorSwatch, Group, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { CATALOG_COLORS } from './catalog';

export interface CatalogItemDraft {
  name: string | null;
  color: string | null;
}

/** Selector de color con las muestras de la paleta (accesible con teclado). */
export function ColorChoice({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (c: string | null) => void;
}) {
  const { t } = useTranslation('people');
  return (
    <div>
      <Text size="sm" fw={500} mb={6}>
        {t('catalogs.color')}
      </Text>
      <Group gap={6} role="radiogroup" aria-label={t('catalogs.color')}>
        <UnstyledButton
          role="radio"
          aria-checked={value === null}
          onClick={() => onChange(null)}
          px={8}
          py={2}
          style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 999 }}
        >
          <Text size="xs">{t('catalogs.noColor')}</Text>
        </UnstyledButton>
        {CATALOG_COLORS.map((c) => (
          <UnstyledButton
            key={c}
            role="radio"
            aria-checked={value === c}
            aria-label={c}
            onClick={() => onChange(c)}
          >
            <ColorSwatch color={`var(--mantine-color-${c}-6)`} size={24}>
              {value === c && <IconCheck size={14} color="white" />}
            </ColorSwatch>
          </UnstyledButton>
        ))}
      </Group>
    </div>
  );
}

type Props = {
  title: string;
  initial: CatalogItemDraft;
  /** Ítem del sistema: el nombre puede quedar vacío para volver a la traducción. */
  systemLabel?: string;
  onClose: () => void;
  onSave: (draft: CatalogItemDraft) => Promise<void>;
};

function ItemForm({ initial, systemLabel, onClose, onSave }: Omit<Props, 'title'>) {
  const { t } = useTranslation(['people', 'common']);
  const [name, setName] = useState(initial.name ?? '');
  const [color, setColor] = useState(initial.color);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const isSystem = systemLabel !== undefined;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
          await onSave({ name: name.trim() || null, color });
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <TextInput
          label={t('catalogs.name')}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={systemLabel}
          description={isSystem ? t('catalogs.systemHint') : undefined}
          maxLength={100}
          required={!isSystem}
          data-autofocus
          rightSectionWidth={isSystem && name ? 'auto' : undefined}
          rightSection={
            isSystem && name ? (
              <Button size="compact-xs" variant="subtle" mr={4} onClick={() => setName('')}>
                {t('catalogs.resetName')}
              </Button>
            ) : undefined
          }
        />
        <ColorChoice value={color} onChange={setColor} />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!isSystem && !name.trim()}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function CatalogItemModal({ opened, title, ...props }: Props & { opened: boolean }) {
  return (
    <ResponsiveModal opened={opened} onClose={props.onClose} title={title} size="md">
      {opened && <ItemForm {...props} />}
    </ResponsiveModal>
  );
}
