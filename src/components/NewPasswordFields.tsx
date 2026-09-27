import { PasswordInput } from '@mantine/core';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

type Values = { newPassword: string; confirm: string };

export function NewPasswordFields<T extends Values>({
  register,
  errors,
  autoFocus,
}: {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation(['auth', 'errors']);
  const reg = register as unknown as UseFormRegister<Values>;
  const err = errors as FieldErrors<Values>;
  const msg = (m?: string) => (m ? t(`errors:validation.${m}` as never) : undefined);
  return (
    <>
      <PasswordInput
        label={t('changePassword.new')}
        description={t('password.hint')}
        autoComplete="new-password"
        autoFocus={autoFocus}
        error={msg(err.newPassword?.message)}
        {...reg('newPassword')}
      />
      <PasswordInput
        label={t('changePassword.confirm')}
        autoComplete="new-password"
        error={msg(err.confirm?.message)}
        {...reg('confirm')}
      />
    </>
  );
}
