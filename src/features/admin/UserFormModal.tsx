import { Button, Checkbox, Group, MultiSelect, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { rolesApi, type AccountUser, type UserInput } from '../../api/admin';
import { FormError } from '../../components/FormError';
import { ResponsiveModal } from '../../components/ResponsiveModal';
import { LANGUAGES } from '../../i18n';

const schema = z.object({
  email: z.string().trim().min(1, 'required').pipe(z.email('email')),
  firstName: z.string().trim().min(1, 'required').max(80),
  lastName: z.string().trim().min(1, 'required').max(80),
  locale: z.enum(['default', 'es', 'en', 'pt']),
  roleIds: z.array(z.string()),
  sendAccessEmail: z.boolean(),
});
type Values = z.infer<typeof schema>;

const toValues = (user: AccountUser | null): Values =>
  user
    ? {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        locale: user.locale ?? 'default',
        roleIds: user.roles.map((r) => String(r.id)),
        sendAccessEmail: false,
      }
    : { email: '', firstName: '', lastName: '', locale: 'default', roleIds: [], sendAccessEmail: false };

type Props = {
  user: AccountUser | null;
  onClose: () => void;
  onSubmit: (values: UserInput) => Promise<void>;
};

/** Contenido del modal: se monta al abrir, así cada apertura arranca con el formulario limpio. */
function UserForm({ user, onClose, onSubmit }: Props) {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const [error, setError] = useState<unknown>(null);
  const roles = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(user) });

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await onSubmit({
        email: v.email,
        firstName: v.firstName,
        lastName: v.lastName,
        locale: v.locale === 'default' ? null : v.locale,
        roleIds: v.roleIds.map(Number),
        sendAccessEmail: v.sendAccessEmail,
      });
    } catch (err) {
      setError(err);
    }
  });

  const msg = (name: 'email' | 'firstName' | 'lastName') => {
    const m = form.formState.errors[name]?.message;
    return m ? t(`errors:validation.${m}` as never) : undefined;
  };

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <FormError error={error} />
        <TextInput
          label={t('users.form.email')}
          type="email"
          inputMode="email"
          autoComplete="off"
          disabled={Boolean(user)}
          data-autofocus={user ? undefined : true}
          error={msg('email')}
          {...form.register('email')}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label={t('users.form.firstName')}
            error={msg('firstName')}
            {...form.register('firstName')}
          />
          <TextInput
            label={t('users.form.lastName')}
            error={msg('lastName')}
            {...form.register('lastName')}
          />
        </SimpleGrid>
        <Controller
          control={form.control}
          name="roleIds"
          render={({ field }) => (
            <MultiSelect
              label={t('users.form.roles')}
              description={t('users.form.rolesHint')}
              data={(roles.data?.items ?? []).map((r) => ({ value: String(r.id), label: r.name }))}
              value={field.value}
              onChange={field.onChange}
              searchable
              clearable
              comboboxProps={{ withinPortal: true }}
            />
          )}
        />
        <Controller
          control={form.control}
          name="locale"
          render={({ field }) => (
            <Select
              label={t('users.form.language')}
              allowDeselect={false}
              data={[
                { value: 'default', label: t('users.form.languageDefault') },
                ...LANGUAGES.map((l) => ({ value: l, label: t(`common:language.${l}`) })),
              ]}
              value={field.value}
              onChange={(v) => field.onChange(v ?? 'default')}
            />
          )}
        />
        {!user && <Checkbox label={t('users.form.sendAccessEmail')} {...form.register('sendAccessEmail')} />}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t('common:actions.save')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

/** Alta (user = null) o edición de un usuario de la cuenta. */
export function UserFormModal({ opened, ...props }: Props & { opened: boolean }) {
  const { t } = useTranslation('admin');
  return (
    <ResponsiveModal
      opened={opened}
      onClose={props.onClose}
      title={props.user ? t('users.form.editTitle') : t('users.form.createTitle')}
    >
      {/* key: al cambiar de usuario con el modal abierto, el formulario se reinicia. */}
      <UserForm key={props.user?.id ?? 'new'} {...props} />
    </ResponsiveModal>
  );
}
