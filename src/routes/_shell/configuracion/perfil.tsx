import {
  Button,
  Card,
  Group,
  Input,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
  useMantineColorScheme,
} from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { notifications } from '@mantine/notifications';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { meApi } from '../../../api/auth';
import type { Me } from '../../../api/types';
import { meQuery } from '../../../auth/session';
import { useSession } from '../../../auth/session-store';
import { FormError } from '../../../components/FormError';
import { LANGUAGES } from '../../../i18n';
import { PageHeader } from '../../../layout/PageHeader';

export const Route = createFileRoute('/_shell/configuracion/perfil')({ component: ProfilePage });

const schema = z.object({
  firstName: z.string().trim().min(1, 'required').max(80),
  lastName: z.string().trim().min(1, 'required').max(80),
  locale: z.enum(['es', 'en', 'pt', 'default']),
  theme: z.enum(['light', 'dark', 'auto']),
});
type Values = z.infer<typeof schema>;

function ProfilePage() {
  const { t } = useTranslation(['settings', 'common', 'errors']);
  const { data: me } = useSuspenseQuery(meQuery());
  const queryClient = useQueryClient();
  const { setColorScheme } = useMantineColorScheme();
  const inSupport = useSession((s) => Boolean(s.support));
  const [error, setError] = useState<unknown>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: me.user.firstName,
      lastName: me.user.lastName,
      locale: me.user.locale ?? 'default',
      theme: me.user.theme,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const updated = await meApi.update({
        ...values,
        locale: values.locale === 'default' ? null : values.locale,
      });
      queryClient.setQueryData(meQuery().queryKey, (old: Me | undefined) =>
        old ? { ...old, user: updated.user, account: updated.account } : old,
      );
      setColorScheme(values.theme);
      form.reset(values);
      notifications.show({ color: 'teal', message: t('common:saved') });
    } catch (err) {
      setError(err);
    }
  });

  const fieldError = (name: 'firstName' | 'lastName') => {
    const msg = form.formState.errors[name]?.message;
    return msg ? t(`errors:validation.${msg}` as never) : undefined;
  };
  const churchLanguage = t(`common:language.${me.account?.defaultLocale ?? 'es'}`);

  return (
    <>
      <PageHeader title={t('profile.title')} />
      <Card withBorder radius="lg" padding="lg" maw={640}>
        <form onSubmit={onSubmit} noValidate>
          <Stack gap="md">
            <FormError error={error} />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label={t('profile.firstName')}
                autoComplete="given-name"
                error={fieldError('firstName')}
                {...form.register('firstName')}
              />
              <TextInput
                label={t('profile.lastName')}
                autoComplete="family-name"
                error={fieldError('lastName')}
                {...form.register('lastName')}
              />
            </SimpleGrid>
            <TextInput
              label={t('profile.email')}
              value={me.user.email}
              readOnly
              description={t('profile.emailHint')}
            />
            <Controller
              control={form.control}
              name="locale"
              render={({ field }) => (
                <Select
                  label={t('profile.language')}
                  allowDeselect={false}
                  data={[
                    ...(me.account
                      ? [
                          {
                            value: 'default',
                            label: t('profile.languageDefault', { language: churchLanguage }),
                          },
                        ]
                      : []),
                    ...LANGUAGES.map((l) => ({ value: l, label: t(`common:language.${l}`) })),
                  ]}
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? 'default')}
                />
              )}
            />
            <Controller
              control={form.control}
              name="theme"
              render={({ field }) => (
                <Input.Wrapper label={t('profile.theme')}>
                  <SegmentedControl
                    mt={6}
                    fullWidth
                    value={field.value}
                    onChange={field.onChange}
                    data={(['light', 'dark', 'auto'] as const).map((v) => ({
                      value: v,
                      label: t(`common:theme.${v}`),
                    }))}
                  />
                </Input.Wrapper>
              )}
            />
            <Group justify="flex-end">
              <Button
                type="submit"
                loading={form.formState.isSubmitting}
                disabled={!form.formState.isDirty || inSupport}
              >
                {t('common:actions.save')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </>
  );
}
