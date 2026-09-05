import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export function isVisiblePost(post: Post): boolean {
  return import.meta.env.DEV || !post.data.draft;
}

export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort(
    (left, right) => right.data.publishedAt.getTime() - left.data.publishedAt.getTime(),
  );
}

export function getPostUrl(post: Post): string {
  return `/posts/${post.id}/`;
}

export function slugifyTag(tag: string): string {
  return tag
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatPostDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function estimateReadingMinutes(body: string | undefined): number {
  const words = body?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  return Math.max(1, Math.ceil(words / 220));
}
