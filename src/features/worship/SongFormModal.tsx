import {
  ActionIcon,
  Box,
  Button,
  Group,
  NumberInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  TagsInput,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LINK_TYPES, songsApi, type LinkType, type Song, type SongLink } from '../../api/worship';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { MAJOR_KEYS, MINOR_KEYS, parseSheet } from './chordpro';
import { SongSheet } from './SongSheet';

const orNull = (v: string) => (v.trim() === '' ? null : v.trim());

function Preview({ text, songKey }: { text: string; songKey: string | null }) {
  const { t } = useTranslation('worship');
  const [debounced] = useDebouncedValue(text, 300);
  const sheet = useMemo(() => {
    try {
      return parseSheet(debounced, 0, songKey);
    } catch {
      return null;
    }
  }, [debounced, songKey]);
  if (!debounced.trim())
    return (
      <Text size="sm" c="dimmed">
        {t('form.previewEmpty')}
      </Text>
    );
  if (!sheet)
    return (
      <Text size="sm" c="red">
        {t('form.previewError')}
      </Text>
    );
  return <SongSheet sheet={sheet} fontSize={14} />;
}

function SongForm({
  song,
  onClose,
  onSaved,
}: {
  song: Song | null;
  onClose: () => void;
  onSaved: (s: Song) => void;
}) {
  const { t } = useTranslation(['worship', 'common']);
  const [title, setTitle] = useState(song?.title ?? '');
  const [author, setAuthor] = useState(song?.author ?? '');
  const [ccli, setCcli] = useState(song?.ccliNumber ?? '');
  const [key, setKey] = useState<string | null>(song?.originalKey ?? null);
  const [bpm, setBpm] = useState<number | string>(song?.bpm ?? '');
  const [timeSignature, setTimeSignature] = useState(song?.timeSignature ?? '');
  const [tags, setTags] = useState<string[]>(song?.tags ?? []);
  const [chordPro, setChordPro] = useState(song?.chordPro ?? '');
  const [notes, setNotes] = useState(song?.notes ?? '');
  const [isActive, setIsActive] = useState(song?.isActive ?? true);
  const [links, setLinks] = useState<SongLink[]>(
    song?.links.map(({ type, url, label }) => ({ type, url, label })) ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const validLinks = links.every((l) => /^https?:\/\/\S+$/.test(l.url.trim()));
  const valid =
    title.trim().length > 0 && validLinks && (!timeSignature || /^\d{1,2}\/\d{1,2}$/.test(timeSignature));
  const setLink = (i: number, patch: Partial<SongLink>) =>
    setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        setError(null);
        const body = {
          title: title.trim(),
          author: orNull(author),
          ccliNumber: orNull(ccli),
          originalKey: key,
          bpm: bpm === '' ? null : Number(bpm),
          timeSignature: orNull(timeSignature),
          chordPro: chordPro.trim() ? chordPro : null,
          tags,
          notes: orNull(notes),
          links: links.map((l) => ({ type: l.type, url: l.url.trim(), label: orNull(l.label ?? '') })),
          ...(song ? { isActive } : {}),
        };
        try {
          onSaved(song ? await songsApi.update(song.id, body) : await songsApi.create(body));
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Stack>
        <FormError error={error} />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label={t('form.title')}
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            maxLength={150}
            required
            data-autofocus
          />
          <TextInput
            label={t('form.author')}
            value={author}
            onChange={(e) => setAuthor(e.currentTarget.value)}
            maxLength={150}
          />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          <Select
            label={t('form.key')}
            data={[
              { group: t('form.major'), items: MAJOR_KEYS },
              { group: t('form.minor'), items: MINOR_KEYS },
            ]}
            value={key}
            onChange={setKey}
            clearable
            searchable
          />
          <NumberInput
            label={t('form.bpm')}
            value={bpm}
            onChange={setBpm}
            min={20}
            max={300}
            allowDecimal={false}
          />
          <TextInput
            label={t('form.timeSignature')}
            placeholder="4/4"
            value={timeSignature}
            onChange={(e) => setTimeSignature(e.currentTarget.value)}
            maxLength={5}
          />
          <TextInput
            label={t('form.ccli')}
            value={ccli}
            onChange={(e) => setCcli(e.currentTarget.value.replace(/\D/g, ''))}
            maxLength={15}
            inputMode="numeric"
          />
        </SimpleGrid>
        <TagsInput
          label={t('form.tags')}
          placeholder={t('form.tagsPlaceholder')}
          value={tags}
          onChange={setTags}
          maxTags={15}
          clearable
        />
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
          <Textarea
            label={t('form.chordPro')}
            description={t('form.chordProHint')}
            value={chordPro}
            onChange={(e) => setChordPro(e.currentTarget.value)}
            autosize
            minRows={10}
            maxRows={24}
            styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 13 } }}
            spellCheck={false}
          />
          <Box>
            <Text size="sm" fw={500} mb={4}>
              {t('form.preview')}
            </Text>
            <ScrollArea.Autosize mah={480} type="auto">
              <Preview text={chordPro} songKey={key} />
            </ScrollArea.Autosize>
          </Box>
        </SimpleGrid>
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            {t('form.links')}
          </Text>
          {links.map((l, i) => (
            <Group key={i} gap="xs" wrap="nowrap" align="flex-start">
              <Select
                w={130}
                aria-label={t('form.linkType')}
                data={LINK_TYPES.map((x) => ({ value: x, label: t(`linkTypes.${x}`) }))}
                value={l.type}
                onChange={(v) => v && setLink(i, { type: v as LinkType })}
                allowDeselect={false}
              />
              <TextInput
                style={{ flex: 2, minWidth: 0 }}
                aria-label={t('form.linkUrl')}
                placeholder="https://"
                value={l.url}
                onChange={(e) => setLink(i, { url: e.currentTarget.value })}
                error={l.url && !/^https?:\/\/\S+$/.test(l.url.trim()) ? t('form.linkInvalid') : undefined}
                maxLength={500}
              />
              <TextInput
                style={{ flex: 1, minWidth: 0 }}
                visibleFrom="sm"
                aria-label={t('form.linkLabel')}
                placeholder={t('form.linkLabel')}
                value={l.label ?? ''}
                onChange={(e) => setLink(i, { label: e.currentTarget.value })}
                maxLength={100}
              />
              <ActionIcon
                variant="subtle"
                color="red"
                size="lg"
                onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}
                aria-label={t('form.removeLink')}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
          {links.length < 10 && (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() => setLinks((ls) => [...ls, { type: 'youtube', url: '', label: null }])}
              style={{ alignSelf: 'flex-start' }}
            >
              {t('form.addLink')}
            </Button>
          )}
        </Stack>
        <Textarea
          label={t('form.notes')}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          maxLength={1000}
          autosize
          minRows={2}
        />
        {song && (
          <Switch
            label={t('form.active')}
            checked={isActive}
            onChange={(e) => setIsActive(e.currentTarget.checked)}
          />
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Alta y edición de una canción (ChordPro con vista previa). */
export function SongFormModal({
  opened,
  song,
  onClose,
  onSaved,
}: {
  opened: boolean;
  song: Song | null;
  onClose: () => void;
  onSaved: (s: Song) => void;
}) {
  const { t } = useTranslation('worship');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title={song ? t('form.editTitle') : t('form.newTitle')}
      size="xl"
    >
      {opened && <SongForm song={song} onClose={onClose} onSaved={onSaved} />}
    </ResponsiveModal>
  );
}
