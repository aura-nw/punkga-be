import { IMangaSlugId } from './utils.interface';

export function detectMangaSlugId(text: any): IMangaSlugId {
  let mangaId = 0;
  let mangaSlug = '';

  if (isNaN(text)) {
    mangaSlug = text;
  } else {
    mangaId = Number(text);
  }

  return {
    mangaId,
    mangaSlug,
  };
}
