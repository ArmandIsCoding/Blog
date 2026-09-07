import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getPostUrl, isPostInLanguage, sortPosts } from '../../lib/posts';

export async function GET(context: { site: URL }) {
  const posts = sortPosts(
    (await getCollection('posts'))
      .filter((post) => !post.data.draft)
      .filter((post) => isPostInLanguage(post, 'en')),
  );

  return rss({
    title: 'helloworld.com.ar — English',
    description: 'English editions of notes about software, architecture, and artificial intelligence.',
    site: new URL('/en/', context.site),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      link: getPostUrl(post),
    })),
    customData: '<language>en</language>',
  });
}
