import { Avatar, Badge, Group, type AvatarProps } from '@mantine/core';
import type { CatalogRef, Tag } from '../../api/people';
import { useFileUrl } from '../../components/use-file-url';
import { useCatalogLabel } from './catalog';
import { fullName } from './format';

type PersonLike = { firstName: string; lastName: string; photoFileId: number | null };

export function PersonAvatar({ person, ...props }: { person: PersonLike } & Omit<AvatarProps, 'src'>) {
  const url = useFileUrl(person.photoFileId);
  return (
    <Avatar radius="xl" color="initials" name={fullName(person)} src={url} alt="" {...props}>
      {`${person.firstName[0] ?? ''}${person.lastName[0] ?? ''}`.toUpperCase()}
    </Avatar>
  );
}

export function StatusBadge({
  status,
  size = 'sm',
}: {
  status: CatalogRef;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const label = useCatalogLabel();
  return (
    <Badge variant="light" color={status.color ?? 'gray'} size={size}>
      {label('person_status', status)}
    </Badge>
  );
}

export function TagBadges({ tags, max = 3 }: { tags: Tag[]; max?: number }) {
  if (tags.length === 0) return null;
  const shown = tags.slice(0, max);
  return (
    <Group gap={4} wrap="wrap">
      {shown.map((t) => (
        <Badge key={t.id} variant="dot" color={t.color ?? 'gray'} size="sm" tt="none">
          {t.name}
        </Badge>
      ))}
      {tags.length > max && (
        <Badge variant="default" size="sm">
          +{tags.length - max}
        </Badge>
      )}
    </Group>
  );
}
