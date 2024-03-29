export function generateSlug(name: string, id?: number) {
  let prefix = name
    .normalize('NFKD') // decompose 1 single code point into multiple combining ones e.g. "ñ" -> "\u006E\u0303"
    .replace(/[\u0300-\u036f]/g, '') // Remove "Combining Diacritical Marks" https://www.ssec.wisc.edu/~tomw/java/unicode.html#x0300
    .toLowerCase()
    .replace(/đ/g, 'd') // js normalize can't decompose đ character so have to replace it manually
    .replaceAll(/[^a-z0-9]+/g, '-');
  // .slice(0, MAX-PREFIX-LENGTH);

  if (prefix.endsWith('-')) {
    prefix = prefix.slice(0, -1);
  }
  if (prefix.startsWith('-')) {
    prefix = prefix.slice(1);
  }

  return id ? `${prefix}-${id}` : prefix;
}
