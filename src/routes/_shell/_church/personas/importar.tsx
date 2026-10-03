import {
  Alert,
  Badge,
  Button,
  Card,
  FileButton,
  Group,
  List,
  Radio,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCircleCheck, IconDownload, IconFileSpreadsheet, IconUpload } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  importApi,
  saveBlob,
  type ImportIssue,
  type ImportJob,
  type ImportRow,
  type ImportSummary,
  type SheetFormat,
} from '../../../../api/people';
import { requirePermission } from '../../../../auth/guards';
import { FormError } from '../../../../components/FormError';
import { errorMessage } from '../../../../i18n/errors';
import { PageHeader } from '../../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/_church/personas/importar')({
  beforeLoad: ({ context }) => requirePermission(context.me, 'personas.importar'),
  component: ImportPage,
});

const MAX_VISIBLE_ROWS = 200;
type Filter = 'all' | 'errors' | 'warnings' | 'duplicates';

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Card withBorder radius="lg" padding="sm">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} size="xl" c={color}>
        {value}
      </Text>
    </Card>
  );
}

function useIssueText() {
  const { t } = useTranslation('people');
  return (issue: ImportIssue) =>
    `${t(`fields.${issue.field}`)}: ${t(`import.codes.${issue.code}` as never, { value: issue.value })}` +
    (issue.value && issue.code !== 'DUPLICATE_IN_FILE' ? ` («${issue.value}»)` : '');
}

function RowProblems({ row }: { row: ImportRow }) {
  const { t } = useTranslation('people');
  const issueText = useIssueText();
  if (!row.errors.length && !row.warnings.length && !row.duplicate) {
    return (
      <Text size="xs" c="dimmed">
        {t('import.noProblems')}
      </Text>
    );
  }
  return (
    <Stack gap={2}>
      {row.errors.map((e, i) => (
        <Text key={`e${i}`} size="xs" c="red">
          {issueText(e)}
        </Text>
      ))}
      {row.warnings.map((w, i) => (
        <Text key={`w${i}`} size="xs" c="yellow.7">
          {issueText(w)}
        </Text>
      ))}
      {row.duplicate && (
        <Text size="xs" c="orange">
          {t('import.duplicateOf', {
            name: `${row.duplicate.firstName} ${row.duplicate.lastName}`,
            reasons: row.duplicate.reasons.map((r) => t(`duplicates.reasons.${r}` as never)).join(', '),
          })}
        </Text>
      )}
    </Stack>
  );
}

function Preview({
  job,
  onCommitted,
  onReset,
}: {
  job: ImportJob;
  onCommitted: (s: ImportSummary) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation(['people', 'common']);
  const [filter, setFilter] = useState<Filter>(job.summary.withErrors ? 'errors' : 'all');
  const [duplicates, setDuplicates] = useState<'skip' | 'create'>('skip');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const s = job.summary;

  const rows = job.rows.filter((r) =>
    filter === 'errors'
      ? r.errors.length > 0
      : filter === 'warnings'
        ? r.warnings.length > 0
        : filter === 'duplicates'
          ? r.duplicate !== null
          : true,
  );
  const toImport = job.rows.filter(
    (r) => r.errors.length === 0 && (duplicates === 'create' || !r.duplicate),
  ).length;

  const commit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await importApi.commit(job.id, duplicates);
      onCommitted(res.summary);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <IconFileSpreadsheet size={20} />
          <Text fw={500}>{job.fileName}</Text>
        </Group>
        <Button variant="subtle" size="xs" onClick={onReset}>
          {t('import.another')}
        </Button>
      </Group>
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Stat label={t('import.summary.total')} value={s.total} />
        <Stat label={t('import.summary.valid')} value={s.valid} color="teal" />
        <Stat
          label={t('import.summary.withErrors')}
          value={s.withErrors}
          color={s.withErrors ? 'red' : undefined}
        />
        <Stat
          label={t('import.summary.duplicates')}
          value={s.duplicates}
          color={s.duplicates ? 'orange' : undefined}
        />
      </SimpleGrid>

      {(s.newTags.length > 0 || s.ignoredColumns.length > 0 || s.unknownColumns.length > 0) && (
        <Alert variant="light" color="blue">
          <List size="sm" spacing={4}>
            {s.newTags.length > 0 && (
              <List.Item>{t('import.newTags', { tags: s.newTags.join(', ') })}</List.Item>
            )}
            {s.ignoredColumns.length > 0 && (
              <List.Item>{t('import.ignoredColumns', { columns: s.ignoredColumns.join(', ') })}</List.Item>
            )}
            {s.unknownColumns.length > 0 && (
              <List.Item>{t('import.unknownColumns', { columns: s.unknownColumns.join(', ') })}</List.Item>
            )}
          </List>
        </Alert>
      )}

      <SegmentedControl
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        data={(['all', 'errors', 'warnings', 'duplicates'] as const).map((f) => ({
          value: f,
          label: t(`import.filter.${f}`),
        }))}
        style={{ alignSelf: 'flex-start' }}
      />

      <Card withBorder radius="lg" p={0}>
        <Table.ScrollContainer minWidth={560} maxHeight={480}>
          <Table stickyHeader verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={64}>{t('import.columns.row')}</Table.Th>
                <Table.Th>{t('import.columns.person')}</Table.Th>
                <Table.Th>{t('import.columns.problems')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.slice(0, MAX_VISIBLE_ROWS).map((r) => (
                <Table.Tr key={r.row} bg={r.errors.length ? 'var(--mantine-color-red-light)' : undefined}>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {r.row}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {`${r.data.firstName} ${r.data.lastName}`.trim() || '—'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {[r.data.phone, r.data.email].filter(Boolean).join(' · ')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <RowProblems row={r} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
      {rows.length > MAX_VISIBLE_ROWS && (
        <Text size="xs" c="dimmed">
          {t('import.moreRows', { count: MAX_VISIBLE_ROWS })}
        </Text>
      )}

      {s.duplicates > 0 && (
        <Radio.Group
          label={t('import.duplicatesMode')}
          value={duplicates}
          onChange={(v) => setDuplicates(v as 'skip' | 'create')}
        >
          <Stack gap={6} mt={6}>
            <Radio value="skip" label={t('import.duplicatesSkip')} />
            <Radio value="create" label={t('import.duplicatesCreate')} />
          </Stack>
        </Radio.Group>
      )}

      <FormError error={error} />
      <Group justify="flex-end">
        {toImport === 0 ? (
          <Text c="dimmed">{t('import.nothingToImport')}</Text>
        ) : (
          <Button size="md" loading={busy} onClick={() => void commit()}>
            {t('import.commit', { count: toImport })}
          </Button>
        )}
      </Group>
    </Stack>
  );
}

function ImportPage() {
  const { t, i18n } = useTranslation(['people', 'common']);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [uploading, setUploading] = useState(false);
  const locale = i18n.resolvedLanguage ?? 'es';

  const template = async (format: SheetFormat) => {
    try {
      const blob = await importApi.template(locale, format);
      saveBlob(blob, `${t('import.title')}.${format}`.replace(/\s+/g, '-').toLowerCase());
    } catch (err) {
      notifications.show({ color: 'red', message: errorMessage(err) });
    }
  };

  const upload = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      setJob(await importApi.preview(file));
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setJob(null);
    setResult(null);
    setError(null);
  };

  return (
    <>
      <PageHeader title={t('import.title')} description={t('import.description')} />

      {result ? (
        <Card withBorder radius="lg">
          <Stack align="flex-start">
            <Group gap="xs">
              <IconCircleCheck color="var(--mantine-color-teal-6)" />
              <Title order={2} size="h4">
                {t('import.done')}
              </Title>
            </Group>
            <Text>
              {t('import.doneBody', { created: result.created ?? 0, skipped: result.skipped ?? 0 })}
            </Text>
            <Group>
              <Button onClick={() => void navigate({ to: '/personas', search: { sort: 'recent' } })}>
                {t('import.goToPeople')}
              </Button>
              <Button variant="default" onClick={reset}>
                {t('import.another')}
              </Button>
            </Group>
          </Stack>
        </Card>
      ) : job ? (
        <Card withBorder radius="lg">
          <Title order={2} size="h5" mb="md">
            {t('import.step3')}
          </Title>
          <Preview
            job={job}
            onReset={reset}
            onCommitted={(s) => {
              setResult(s);
              void queryClient.invalidateQueries({ queryKey: ['people'] });
              void queryClient.invalidateQueries({ queryKey: ['tags'] });
            }}
          />
        </Card>
      ) : (
        <Stack>
          <Card withBorder radius="lg">
            <Title order={2} size="h5">
              {t('import.step1')}
            </Title>
            <Text size="sm" c="dimmed" mt={4} mb="sm">
              {t('import.step1Hint')}
            </Text>
            <Group>
              <Button
                variant="default"
                leftSection={<IconDownload size={16} />}
                onClick={() => void template('xlsx')}
              >
                {t('import.templateXlsx')}
              </Button>
              <Button
                variant="subtle"
                leftSection={<IconDownload size={16} />}
                onClick={() => void template('csv')}
              >
                {t('import.templateCsv')}
              </Button>
            </Group>
          </Card>
          <Card withBorder radius="lg">
            <Title order={2} size="h5" mb="sm">
              {t('import.step2')}
            </Title>
            <Stack align="flex-start">
              <FormError error={error} />
              <FileButton
                onChange={(f) => void upload(f)}
                accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              >
                {(props) => (
                  <Button {...props} leftSection={<IconUpload size={18} />} loading={uploading}>
                    {t('import.drop')}
                  </Button>
                )}
              </FileButton>
              {uploading && (
                <Badge variant="light" size="lg">
                  {t('import.uploading')}
                </Badge>
              )}
            </Stack>
          </Card>
        </Stack>
      )}
    </>
  );
}
