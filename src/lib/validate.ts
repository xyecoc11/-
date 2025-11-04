import { z } from 'zod';

export const companyIdSchema = z.string().min(3).regex(/^biz_[A-Za-z0-9]+|[A-Za-z0-9_-]+$/);
export const daysSchema = z.coerce.number().int().min(1).max(365).default(90);

export function parseCompanyId(value: unknown) {
  const res = companyIdSchema.safeParse(value);
  if (!res.success) throw new Error('Invalid companyId');
  return res.data;
}

export function parseDays(value: unknown) {
  const res = daysSchema.safeParse(value);
  if (!res.success) throw new Error('Invalid days');
  return res.data;
}


