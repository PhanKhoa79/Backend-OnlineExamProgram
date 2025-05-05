import { add } from 'date-fns';

export function calculateExpiryDate(expiresIn: string): Date {
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([smhd])$/);

  if (!match) return add(now, { days: 7 }); // default 7d nếu lỗi

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return add(now, { seconds: value });
    case 'm':
      return add(now, { minutes: value });
    case 'h':
      return add(now, { hours: value });
    case 'd':
      return add(now, { days: value });
    default:
      return add(now, { days: 7 });
  }
}
