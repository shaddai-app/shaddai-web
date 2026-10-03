import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import type { Me } from '../../api/types';
import { homePath, pendingStep, safeRedirect } from '../../auth/guards';
import { logout } from '../../auth/session';
import type { AuthView } from '../../auth/views';
import { ChangePasswordForm } from './ChangePasswordForm';
import { ForgotForm } from './ForgotForm';
import { LoginForm } from './LoginForm';
import { ResetForm } from './ResetForm';
import { TotpSetupForm } from './TotpSetupForm';
import classes from './auth.module.css';

/**
 * Tarjeta de ingreso del home: login (con 2FA), recuperar y restablecer la contraseña, y los pasos
 * obligatorios después de ingresar. La vista va en la URL (`?vista=`), así el mail de recuperación y
 * los guards pueden abrir directo la que corresponde.
 */
export function AuthCard() {
  const search = useSearch({ from: '/' });
  const navigate = useNavigate({ from: '/' });
  const queryClient = useQueryClient();
  const view = search.vista ?? 'login';
  const ref = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Al cambiar de vista (o al llegar desde el mail): la tarjeta a la vista y el foco en el primer campo.
  // En el celular la tarjeta está debajo de la portada.
  useEffect(() => {
    const initial = firstRender.current;
    firstRender.current = false;
    if (initial && view === 'login') return;
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    if (box.top < 64 || box.bottom > window.innerHeight)
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.querySelector<HTMLInputElement>('input:not([type="checkbox"])')?.focus({ preventScroll: true });
  }, [view]);

  // resetScroll: false — el cambio de vista no vuelve la página arriba (en el celular la tarjeta está abajo).
  const go = (vista?: AuthView) =>
    void navigate({ search: (s) => ({ redirect: s.redirect, vista }), resetScroll: false });

  const leave = async () => {
    await logout(queryClient);
    await navigate({ search: {}, resetScroll: false });
  };

  /** Paso obligatorio completo: el siguiente pendiente, o adonde iba, o el inicio. */
  const finish = async (me: Me) => {
    const pending = pendingStep(me);
    if (pending)
      return navigate({ search: (s) => ({ redirect: s.redirect, vista: pending }), resetScroll: false });
    const target = safeRedirect(search.redirect);
    return target ? navigate({ href: target }) : navigate({ to: homePath(me) });
  };

  return (
    <div ref={ref} key={view} className={classes.enter}>
      {view === 'olvide' ? (
        <ForgotForm onBack={() => go()} />
      ) : view === 'restablecer' ? (
        <ResetForm token={search.token} onLogin={() => go()} onForgot={() => go('olvide')} />
      ) : view === 'cambiar-contrasena' ? (
        <ChangePasswordForm forced onDone={finish} onLogout={() => void leave()} />
      ) : view === 'configurar-2fa' ? (
        <TotpSetupForm onDone={(me) => void finish(me)} onLogout={() => void leave()} />
      ) : (
        <LoginForm redirect={search.redirect} closed={Boolean(search.closed)} onForgot={() => go('olvide')} />
      )}
    </div>
  );
}
