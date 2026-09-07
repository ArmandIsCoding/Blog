import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export type SiteLanguage = 'es' | 'en';

export function isVisiblePost(post: Post): boolean {
  return import.meta.env.DEV || !post.data.draft;
}

export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort(
    (left, right) => right.data.publishedAt.getTime() - left.data.publishedAt.getTime(),
  );
}

export function getPostUrl(post: Post): string {
  return post.data.lang === 'en' ? `/en/posts/${post.id}/` : `/posts/${post.id}/`;
}

export function isPostInLanguage(post: Post, lang: SiteLanguage): boolean {
  return post.data.lang === lang;
}

export function slugifyTag(tag: string): string {
  return tag
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatPostDate(date: Date, lang: SiteLanguage = 'es'): string {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-AR', {
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
