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

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

export function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getEndOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export function formatDateToString(date: Date, format = 'yyyy-mm-dd'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`;
    case 'dd/mm/yyyy':
      return `${day}/${month}/${year}`;
    case 'mm/dd/yyyy':
      return `${month}/${day}/${year}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

export function parseDateString(dateString: string): Date | null {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

export function getTimezoneName(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function convertToTimezone(date: Date, timezone: string): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const targetTime = new Date(utc + 3600000 * getTimezoneOffset(timezone));
  return targetTime;
}

function getTimezoneOffset(timezone: string): number {
  const timezoneOffsets: Record<string, number> = {
    'UTC': 0,
    'GMT': 0,
    'EST': -5,
    'PST': -8,
    'JST': 9,
    'IST': 5.5,
    'CET': 1,
    'MST': -7,
    'CST': -6,
    'ICT': 7, // Indochina Time (Vietnam, Thailand, Laos, Cambodia)
  };

  return timezoneOffsets[timezone] || 0;
}

/**
 * Chuyển đổi Date sang múi giờ Việt Nam (+7)
 * @param date - Date object cần chuyển đổi
 * @returns Date object đã được chuyển sang múi giờ +7
 */
export function toVietnamTime(date: Date | null | undefined): Date | null {
  if (!date) return null;

  // Tạo một Date mới với offset +7 giờ
  const vietnamTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vietnamTime;
}

/**
 * Chuyển đổi Date UTC sang string theo múi giờ Việt Nam (+7)
 * @param date - Date object UTC cần chuyển đổi
 * @returns ISO string đã được điều chỉnh theo múi giờ +7
 */
export function toVietnamTimeString(
  date: Date | null | undefined,
): string | null {
  if (!date) return null;

  // Chuyển đổi sang múi giờ Việt Nam (+7 giờ)
  const vietnamTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vietnamTime.toISOString();
}

/**
 * Format thời gian theo múi giờ Việt Nam cho hiển thị
 * @param date - Date object cần format
 * @returns String định dạng dd/mm/yyyy hh:mm:ss
 */
export function formatVietnamDisplayTime(
  date: Date | null | undefined,
): string {
  if (!date) return '';

  // Sử dụng Intl.DateTimeFormat với timezone Asia/Ho_Chi_Minh
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}
