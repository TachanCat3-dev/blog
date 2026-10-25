import rss from '@astrojs/rss';
import site from '../../site.json';
import { getNotes } from '../lib/notes';
export async function GET() {
  const notes = await getNotes();
  return rss({
    title: site.title,
    description: site.description,
    site: site.url,
    items: notes.map((note) => ({ title: note.data.title, pubDate: note.data.date, description: note.data.summary, link: new URL(`posts/${note.id}/`, site.url).href, categories: note.data.tags })),
    customData: '<language>zh-CN</language>',
  });
}
