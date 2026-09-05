import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getPostUrl, sortPosts } from '../lib/posts';

export async function GET(context: { site: URL }) {
  const posts = sortPosts((await getCollection('posts')).filter((post) => !post.data.draft));

  return rss({
    title: 'helloworld.com.ar',
    description: 'Notas sobre software, desarrollo, arquitectura e inteligencia artificial.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      link: getPostUrl(post),
    })),
    customData: '<language>es-AR</language>',
  });
}
