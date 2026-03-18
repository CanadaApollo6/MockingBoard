/** Max length constraints for user-supplied text fields. */
export const MAX_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_BIO_LENGTH = 300;
export const MAX_REPORT_CONTENT_LENGTH = 10_000;
export const MAX_NOTE_LENGTH = 280;
export const MAX_COMPARISON_LENGTH = 200;
export const MAX_STRENGTH_LENGTH = 200;
export const MAX_ARRAY_ITEMS = 50;

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 80 && SLUG_RE.test(slug);
}

export function validateStringLength(
  value: string | undefined,
  max: number,
): boolean {
  return value === undefined || value.length <= max;
}
