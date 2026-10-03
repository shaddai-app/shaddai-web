import {
  Alert,
  Anchor,
  AppShell,
  Avatar,
  Burger,
  Button,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertTriangle, IconDots, IconHeadset, IconLogout } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { accountApi } from '../api/admin';
import { ShaddaiIcon } from '../components/BrandLogo';
import { authApi } from '../api/auth';
import { useFileUrl } from '../components/use-file-url';
import { DemoBanner } from '../features/demo/DemoNotice';
import { leaveSupport } from '../features/platform/support';
import { NotificationBell } from '../features/notifications/NotificationBell';
import { GlobalSearch, SearchTrigger } from '../features/search/GlobalSearch';
import type { Me } from '../api/types';
import { homePath } from '../auth/guards';
import { can } from '../auth/permissions';
import { logout } from '../auth/session';
import { useSession } from '../auth/session-store';
import { ColorSchemeToggle } from './ColorSchemeToggle';
import { LanguageMenu } from './LanguageMenu';
import { navFor, type NavItem } from './nav';
import classes from './AppShellLayout.module.css';

function isActive(pathname: string, item: NavItem) {
  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  if (item.excludeActive?.some(under)) return false;
  if (item.alsoActive?.some(under)) return true;
  return item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function SupportBanner({ me }: { me: Me }) {
  const { t } = useTranslation();
  const support = useSession((s) => s.support);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  if (!me.impersonation || !support) return null;

  const end = async () => {
    try {
      await authApi.stopSupport();
    } finally {
      leaveSupport(queryClient);
      void navigate({ to: '/plataforma' });
    }
  };

  return (
    <Alert
      color="orange"
      variant="filled"
      radius={0}
      py={6}
      icon={<IconHeadset size={18} />}
      className={classes.supportBanner}
      role="status"
    >
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="xs" lineClamp={2}>
          {t('support.banner', { email: support.userEmail })} ·{' '}
          {t('support.expires', { time: dayjs(support.expiresAt).format('HH:mm') })}
        </Text>
        <Button size="xs" variant="white" color="orange" onClick={() => void end()}>
          {t('support.end')}
        </Button>
      </Group>
    </Alert>
  );
}

function AccountStatusBanner({ me }: { me: Me }) {
  const { t } = useTranslation();
  const account = me.account;
  if (!account) return null;
  const expiredTrial =
    account.status === 'trial' && account.trialEndsAt && dayjs(account.trialEndsAt).isBefore(dayjs());
  if (account.status === 'past_due' || expiredTrial) {
    return (
      <Alert color="yellow" radius={0} icon={<IconAlertTriangle size={18} />} className={classes.banner}>
        {t('account.readOnly')}{' '}
        {can(me, 'cuenta.configurar') ? (
          <Anchor component={Link} to="/admin/facturacion" size="sm" fw={600}>
            {t('account.goToBilling')}
          </Anchor>
        ) : (
          t('account.readOnlyAsk')
        )}
      </Alert>
    );
  }
  if (account.status === 'trial' && account.trialEndsAt) {
    const days = Math.max(0, dayjs(account.trialEndsAt).diff(dayjs(), 'day'));
    if (days <= 7) {
      return (
        <Alert color="blue" radius={0} className={classes.banner}>
          {t('account.trialDaysLeft', { count: days })}
        </Alert>
      );
    }
  }
  return null;
}

function UserMenu({ me }: { me: Me }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const initials = `${me.user.firstName[0] ?? ''}${me.user.lastName[0] ?? ''}`.toUpperCase();

  return (
    <Menu position="bottom-end" width={220} withinPortal>
      <Menu.Target>
        <UnstyledButton aria-label={t('userMenu.label')} className={classes.userButton}>
          <Avatar radius="xl" size={34} color="initials" name={`${me.user.firstName} ${me.user.lastName}`}>
            {initials}
          </Avatar>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          <Text size="sm" fw={500} c="var(--mantine-color-text)" truncate>
            {me.user.firstName} {me.user.lastName}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {me.user.email}
          </Text>
        </Menu.Label>
        <Menu.Divider />
        <Menu.Item component={Link} to="/configuracion/perfil">
          {t('nav.profile')}
        </Menu.Item>
        <Menu.Item component={Link} to="/configuracion/seguridad">
          {t('nav.security')}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconLogout size={16} />}
          onClick={async () => {
            await logout(queryClient);
            void navigate({ to: '/' });
          }}
        >
          {t('userMenu.logout')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

/** Logo de la iglesia (si subió uno) o el hexágono de Shaddai. */
function BrandMark({ me }: { me: Me }) {
  const account = useQuery({ queryKey: ['account'], queryFn: accountApi.get, enabled: Boolean(me.account) });
  const url = useFileUrl(account.data?.logoFileId);
  if (url) return <Avatar src={url} radius="md" size={34} alt="" />;
  return <ShaddaiIcon size={34} />;
}

/** Shell de la app: sidebar en escritorio, drawer + barra inferior en el celular. */
export function AppShellLayout({ me, children }: { me: Me; children: ReactNode }) {
  const { t } = useTranslation();
  const [opened, { toggle, close }] = useDisclosure();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const sections = navFor(me);
  const mobileItems = sections
    .flatMap((s) => s.items)
    .filter((i) => i.mobile)
    .slice(0, 4);
  const title = me.account?.name ?? t('nav.platform');
  const support = Boolean(me.impersonation);
  // La búsqueda global es de la iglesia: el panel de plataforma no la usa.
  const searchable = Boolean(me.account);

  return (
    <AppShell
      // El banner de soporte vive dentro del header: su alto se suma (más alto en celular por el wrap).
      header={{ height: support ? { base: 60 + 72, sm: 60 + 48 } : 60 }}
      navbar={{ width: 264, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      footer={{ height: { base: 64, sm: 0 } }}
      padding="md"
      classNames={{ header: classes.header, navbar: classes.navbar, footer: classes.footer }}
    >
      <AppShell.Header>
        <SupportBanner me={me} />
        <Group h={60} px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" miw={0}>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label={opened ? t('nav.closeMenu') : t('nav.openMenu')}
            />
            {/* Logo y nombre: llevan al inicio. */}
            <UnstyledButton
              component={Link}
              to={homePath(me)}
              className={classes.brandLink}
              aria-label={t('nav.home')}
            >
              <BrandMark me={me} />
              <Text fw={600} truncate>
                {title}
              </Text>
            </UnstyledButton>
          </Group>
          <Group gap={4} wrap="nowrap">
            {searchable && <SearchTrigger />}
            {searchable && <NotificationBell />}
            <LanguageMenu />
            <ColorSchemeToggle />
            <UserMenu me={me} />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" aria-label={t('nav.main')}>
        <ScrollArea>
          <Stack gap="md">
            {sections.map((section, i) => (
              <div key={section.title ?? i}>
                {section.title && (
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" px="sm" mb={4}>
                    {t(`nav.${section.title}`)}
                  </Text>
                )}
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    component={Link}
                    to={item.to}
                    // El estado activo lo decide isActive (con excepciones), no el matching difuso del router.
                    activeOptions={{ exact: true }}
                    aria-current={isActive(pathname, item) ? 'page' : undefined}
                    label={t(`nav.${item.label}`)}
                    leftSection={<item.icon size={20} stroke={1.6} />}
                    active={isActive(pathname, item)}
                    onClick={close}
                    className={classes.navLink}
                  />
                ))}
              </div>
            ))}
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      {searchable && <GlobalSearch />}
      <AppShell.Main>
        <DemoBanner me={me} />
        <AccountStatusBanner me={me} />
        {children}
      </AppShell.Main>

      {/* Barra inferior: solo en celular (ver CSS). */}
      <AppShell.Footer hiddenFrom="sm">
        <nav className={classes.bottomNav} aria-label={t('nav.main')}>
          {mobileItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              aria-current={isActive(pathname, item) ? 'page' : undefined}
              className={classes.bottomItem}
              data-active={isActive(pathname, item) || undefined}
              onClick={close}
            >
              <item.icon size={22} stroke={1.6} />
              <span>{t(`nav.${item.label}`)}</span>
            </Link>
          ))}
          <button
            type="button"
            className={classes.bottomItem}
            onClick={toggle}
            data-active={opened || undefined}
          >
            <IconDots size={22} stroke={1.6} />
            <span>{t('nav.more')}</span>
          </button>
        </nav>
      </AppShell.Footer>
    </AppShell>
  );
}
