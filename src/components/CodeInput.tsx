import { Center, Input, PinInput } from '@mantine/core';
import { useEffect, useRef } from 'react';

/** Código TOTP de 6 dígitos (autocompletado desde la app/SMS en celulares). */
export function CodeInput({
  label,
  value,
  onChange,
  onComplete,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);

  // Tras un código incorrecto el padre limpia el valor: el foco vuelve al primer casillero.
  useEffect(() => {
    if (value === '' && !disabled) container.current?.querySelector('input')?.focus();
  }, [value, disabled]);

  return (
    <Input.Wrapper label={label} error={error}>
      <Center mt={6} ref={container}>
        <PinInput
          length={6}
          type="number"
          oneTimeCode
          size="lg"
          value={value}
          // Envío automático al completar los 6 dígitos. No se usa onComplete de PinInput: no se dispara
          // de nuevo cuando el campo se limpia y se vuelve a completar tras un código incorrecto.
          onChange={(v) => {
            onChange(v);
            if (v.length === 6 && /^\d{6}$/.test(v)) onComplete?.(v);
          }}
          error={Boolean(error)}
          disabled={disabled}
          aria-label={label}
        />
      </Center>
    </Input.Wrapper>
  );
}
