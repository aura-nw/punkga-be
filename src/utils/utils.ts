import { ISlugId } from './utils.interface';

export function detectSlugOrId(text: any): ISlugId {
  let id = 0;
  let slug = '';

  if (isNaN(text)) {
    slug = text;
  } else {
    id = Number(text);
  }

  return {
    id,
    slug,
  };
}
