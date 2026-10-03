import {
  Accordion,
  Anchor,
  Box,
  Burger,
  Button,
  Container,
  Divider,
  Drawer,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate } from '@tanstack/react-router';
import {
  IconBook,
  IconBuildingChurch,
  IconCalendarEvent,
  IconCheck,
  IconCoin,
  IconDeviceMobile,
  IconHeartHandshake,
  IconHierarchy2,
  IconLanguage,
  IconMusic,
  IconPackage,
  IconPray,
  IconShieldLock,
  IconUserHeart,
  IconUsers,
  IconUsersGroup,
  IconWifiOff,
  IconWriting,
  type Icon,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ShaddaiLogo } from '../../components/BrandLogo';
import { AnchorLink } from '../../components/links';
import { ColorSchemeToggle } from '../../layout/ColorSchemeToggle';
import { LanguageLinks } from '../../layout/LanguageLinks';
import { LanguageMenu } from '../../layout/LanguageMenu';
import { AuthCard } from '../auth/AuthCard';
import { DemoMenu } from './DemoMenu';
import { PlansSection } from './PlansSection';
import classes from './landing.module.css';

/**
 * Contacto público: solo si hay un mail real configurado (VITE_SUPPORT_EMAIL). El de ejemplo del
 * .env (@shaddai.local) no se muestra: no se inventa un contacto.
 */
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL;
const CONTACT_EMAIL = SUPPORT_EMAIL && !SUPPORT_EMAIL.endsWith('.local') ? SUPPORT_EMAIL : null;

const AUDIENCE: { key: string; icon: Icon }[] = [
  { key: 'pastors', icon: IconBuildingChurch },
  { key: 'leaders', icon: IconUsersGroup },
  { key: 'treasury', icon: IconCoin },
  { key: 'office', icon: IconWriting },
];

const MODULES: { key: string; icon: Icon }[] = [
  { key: 'people', icon: IconUsers },
  { key: 'consolidation', icon: IconUserHeart },
  { key: 'cells', icon: IconHierarchy2 },
  { key: 'discipleship', icon: IconBook },
  { key: 'calendar', icon: IconCalendarEvent },
  { key: 'ministries', icon: IconHeartHandshake },
  { key: 'worship', icon: IconMusic },
  { key: 'prayer', icon: IconPray },
  { key: 'finance', icon: IconCoin },
  { key: 'inventory', icon: IconPackage },
  { key: 'admin', icon: IconShieldLock },
];

const CELL_POINTS = ['map', 'report', 'tracker', 'growth', 'structure'] as const;
const FINANCE_POINTS = ['accounts', 'offerings', 'closings', 'reports'] as const;
const SECURITY_POINTS = ['roles', 'sensitive', 'audit', 'twoFactor', 'export'] as const;
const FAQ = ['install', 'offline', 'people', 'payment', 'cancel', 'languages', 'demo'] as const;

/** "Ingresar": la tarjeta de la portada vuelve al login (si estaba en otra vista) y toma el foco. */
function useGoToLogin() {
  const navigate = useNavigate({ from: '/' });
  return async () => {
    await navigate({ search: (s) => ({ redirect: s.redirect }), resetScroll: false });
    const card = document.getElementById('ingresar');
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card?.querySelector<HTMLInputElement>('input[type="email"]')?.focus({ preventScroll: true });
  };
}

function SectionTitle({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }) {
  return (
    <Stack gap="sm" maw={720}>
      {eyebrow && <Text className={classes.eyebrow}>{eyebrow}</Text>}
      <h2 className={classes.h2}>{title}</h2>
      <div className={classes.titleLine} aria-hidden />
      {lead && <Text className={classes.lead}>{lead}</Text>}
    </Stack>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <Stack gap="sm" component="ul" m={0} p={0} style={{ listStyle: 'none' }}>
      {items.map((item) => (
        <Group key={item} component="li" gap="sm" wrap="nowrap" align="flex-start">
          <IconCheck size={20} className={classes.check} aria-hidden />
          <Text>{item}</Text>
        </Group>
      ))}
    </Stack>
  );
}

function Section({ id, band, children }: { id?: string; band?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={`${classes.section} ${band ? classes.band : ''}`}>
      <Container size="lg">{children}</Container>
    </section>
  );
}

function LandingHeader() {
  const { t } = useTranslation('landing');
  const [opened, { toggle, close }] = useDisclosure();
  const goToLogin = useGoToLogin();
  const links = [
    { href: '#funciones', label: t('nav.features') },
    { href: '#precios', label: t('nav.pricing') },
    { href: '#preguntas', label: t('nav.faq') },
  ];
  return (
    <header className={classes.header}>
      <Container size="lg" h="100%">
        <Group h="100%" justify="space-between" wrap="nowrap" gap="sm">
          <ShaddaiLogo height={30} />
          <Group gap="xl" visibleFrom="md" component="nav" aria-label={t('nav.menu')}>
            {links.map((l) => (
              <a key={l.href} href={l.href} className={classes.navLink}>
                {l.label}
              </a>
            ))}
          </Group>
          <Group gap={4} wrap="nowrap">
            <Group gap={4} visibleFrom="sm" wrap="nowrap">
              <LanguageMenu />
              <ColorSchemeToggle />
            </Group>
            <Button variant="default" onClick={() => void goToLogin()} size="sm" h={40}>
              {t('nav.login')}
            </Button>
            <DemoMenu size="sm" h={40} visibleFrom="sm" />
            <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" aria-label={t('nav.menu')} />
          </Group>
        </Group>
      </Container>
      <Drawer opened={opened} onClose={close} position="right" size="xs" title={<ShaddaiLogo height={26} />}>
        <Stack gap="lg">
          <Stack gap="md" component="nav" aria-label={t('nav.menu')}>
            {links.map((l) => (
              <a key={l.href} href={l.href} className={classes.navLink} onClick={close}>
                {l.label}
              </a>
            ))}
          </Stack>
          <Divider />
          <Group gap={4}>
            <LanguageMenu />
            <ColorSchemeToggle />
          </Group>
        </Stack>
      </Drawer>
    </header>
  );
}

function Hero() {
  const { t } = useTranslation(['landing', 'common']);
  return (
    <section className={`${classes.section} ${classes.night}`}>
      <Container size="lg">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={48} style={{ alignItems: 'center' }}>
          <Stack gap="lg">
            <h1 className={classes.display}>{t('hero.title')}</h1>
            <div className={classes.goldLine} aria-hidden />
            <Text fz={{ base: 17, md: 19 }} className={classes.nightMuted}>
              {t('hero.subtitle')}
            </Text>
            <Group gap="sm">
              <DemoMenu className={classes.lightButton} />
              <Button component="a" href="#funciones" variant="outline" color="gray.0">
                {t('hero.seeHow')}
              </Button>
            </Group>
            <Text size="sm" className={classes.nightMuted}>
              {t('demo.note')}
            </Text>
          </Stack>
          <Box
            id="ingresar"
            className={classes.loginCard}
            p={{ base: 'lg', sm: 'xl' }}
            maw={440}
            w="100%"
            mx="auto"
          >
            <AuthCard />
          </Box>
        </SimpleGrid>
      </Container>
    </section>
  );
}

function FeatureCard({ icon: IconC, title, body }: { icon: Icon; title: string; body: string }) {
  return (
    <Box className={classes.card} p="lg">
      <Stack gap="sm">
        <ThemeIcon variant="light" size={44} radius="md" aria-hidden>
          <IconC size={24} stroke={1.6} />
        </ThemeIcon>
        <Title order={3} fz={19} fw={600}>
          {title}
        </Title>
        <Text size="sm" c="var(--sh-texto-2)">
          {body}
        </Text>
      </Stack>
    </Box>
  );
}

function Footer() {
  const { t } = useTranslation(['landing', 'common', 'legal']);
  return (
    <footer className={classes.night}>
      <Container size="lg" py={64}>
        <Stack gap="xl">
          <Stack gap="md" align="flex-start">
            <h2 className={classes.h2}>{t('cta.title')}</h2>
            <div className={classes.goldLine} aria-hidden />
            <Text className={classes.nightMuted}>{t('cta.body')}</Text>
            <DemoMenu className={classes.lightButton} />
          </Stack>
          <Divider color="rgba(255,255,255,0.15)" />
          <Group justify="space-between" align="flex-start" gap="lg">
            <Stack gap="xs">
              <ShaddaiLogo tone="dark" height={30} />
              <Text size="sm" className={classes.nightMuted}>
                {t('common:tagline')}
              </Text>
            </Stack>
            <Stack gap={6}>
              <AnchorLink to="/privacidad" className={classes.footerLink}>
                {t('legal:links.privacy')}
              </AnchorLink>
              <AnchorLink to="/terminos" className={classes.footerLink}>
                {t('legal:links.terms')}
              </AnchorLink>
              {CONTACT_EMAIL && (
                <Anchor href={`mailto:${CONTACT_EMAIL}`} className={classes.footerLink}>
                  {t('footer.contact')}: {CONTACT_EMAIL}
                </Anchor>
              )}
            </Stack>
          </Group>
          <Group justify="space-between" gap="sm">
            <LanguageLinks c="rgba(255, 255, 255, 0.78)" />
            <Text size="xs" className={classes.nightMuted}>
              {t('footer.rights', { year: new Date().getFullYear() })}
            </Text>
          </Group>
        </Stack>
      </Container>
    </footer>
  );
}

/** Página de presentación de Shaddai: qué es, para quién, módulos, planes, preguntas e ingreso. */
export function Landing() {
  const { t } = useTranslation('landing');
  return (
    <div className={classes.page}>
      <LandingHeader />
      <main>
        <Hero />

        <Section>
          <Stack gap="xl">
            <SectionTitle title={t('audience.title')} />
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
              {AUDIENCE.map(({ key, icon }) => (
                <FeatureCard
                  key={key}
                  icon={icon}
                  title={t(`audience.items.${key}.title` as never)}
                  body={t(`audience.items.${key}.body` as never)}
                />
              ))}
            </SimpleGrid>
          </Stack>
        </Section>

        <Section id="funciones" band>
          <Stack gap="xl">
            <SectionTitle title={t('modules.title')} lead={t('modules.subtitle')} />
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {MODULES.map(({ key, icon }) => (
                <FeatureCard
                  key={key}
                  icon={icon}
                  title={t(`modules.items.${key}.title` as never)}
                  body={t(`modules.items.${key}.body` as never)}
                />
              ))}
            </SimpleGrid>
          </Stack>
        </Section>

        <Section>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={48}>
            <SectionTitle eyebrow={t('cells.eyebrow')} title={t('cells.title')} lead={t('cells.body')} />
            <CheckList items={CELL_POINTS.map((k) => t(`cells.points.${k}`))} />
          </SimpleGrid>
        </Section>

        <Section band>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={48}>
            <SectionTitle
              eyebrow={t('finance.eyebrow')}
              title={t('finance.title')}
              lead={t('finance.body')}
            />
            <CheckList items={FINANCE_POINTS.map((k) => t(`finance.points.${k}`))} />
          </SimpleGrid>
        </Section>

        <Section>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={48}>
            <SectionTitle eyebrow={t('security.eyebrow')} title={t('security.title')} />
            <CheckList items={SECURITY_POINTS.map((k) => t(`security.points.${k}`))} />
          </SimpleGrid>
        </Section>

        <Section band>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={48}>
            <SectionTitle eyebrow={t('mobile.eyebrow')} title={t('mobile.title')} />
            <Stack gap="md" justify="center">
              {[
                { icon: IconDeviceMobile, text: t('mobile.install') },
                { icon: IconWifiOff, text: t('cells.points.report') },
                { icon: IconLanguage, text: t('mobile.languages') },
              ].map(({ icon: IconC, text }) => (
                <Group key={text} gap="md" wrap="nowrap" align="flex-start">
                  <ThemeIcon variant="light" size={40} radius="md" aria-hidden>
                    <IconC size={22} stroke={1.6} />
                  </ThemeIcon>
                  <Text>{text}</Text>
                </Group>
              ))}
            </Stack>
          </SimpleGrid>
        </Section>

        <Section id="precios">
          <PlansSection />
        </Section>

        <Section id="preguntas" band>
          <Stack gap="xl" maw={800}>
            <SectionTitle title={t('faq.title')} />
            <Accordion variant="separated" radius="md">
              {FAQ.map((key) => (
                <Accordion.Item key={key} value={key} bg="var(--sh-superficie)">
                  <Accordion.Control>
                    <Text fw={600}>{t(`faq.items.${key}.q`)}</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Text c="var(--sh-texto-2)">{t(`faq.items.${key}.a`)}</Text>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Stack>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
