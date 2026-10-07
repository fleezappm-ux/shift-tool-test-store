const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, "0");
const toUtcKey = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const toLocalKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const utcDate = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));

const nthMonday = (year: number, month: number, nth: number) => {
  const first = utcDate(year, month, 1);
  const offset = (8 - first.getUTCDay()) % 7;
  return utcDate(year, month, 1 + offset + (nth - 1) * 7);
};

// 1980～2099年に使える国立天文台の近似式。
const vernalEquinoxDay = (year: number) => Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
const autumnEquinoxDay = (year: number) => Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));

function addBaseHolidays(year: number, holidays: Set<string>) {
  const add = (month: number, day: number) => holidays.add(toUtcKey(utcDate(year, month, day)));
  const addDate = (date: Date) => holidays.add(toUtcKey(date));

  add(1, 1);
  addDate(nthMonday(year, 1, 2));
  add(2, 11);
  if (year >= 2020) add(2, 23);
  add(3, vernalEquinoxDay(year));
  add(4, 29);
  add(5, 3);
  add(5, 4);
  add(5, 5);

  // 東京五輪による2020・2021年だけの移動にも対応。
  if (year === 2020) {
    add(7, 23);
    add(7, 24);
    add(8, 10);
  } else if (year === 2021) {
    add(7, 22);
    add(7, 23);
    add(8, 8);
  } else {
    addDate(nthMonday(year, 7, 3));
    add(8, 11);
  }

  addDate(nthMonday(year, 9, 3));
  add(9, autumnEquinoxDay(year));
  if (year !== 2020 && year !== 2021) addDate(nthMonday(year, 10, 2));
  add(11, 3);
  add(11, 23);
}

/** 日本の国民の祝日（国民の休日・振替休日を含む）を端末内で算出します。 */
export function getJapaneseHolidayDates(startDate: Date, endDate: Date): string[] {
  const holidays = new Set<string>();
  for (let year = startDate.getFullYear() - 1; year <= endDate.getFullYear() + 1; year += 1) {
    addBaseHolidays(year, holidays);
  }

  // 前後を祝日に挟まれた平日は「国民の休日」。
  for (let year = startDate.getFullYear() - 1; year <= endDate.getFullYear() + 1; year += 1) {
    for (let cursor = utcDate(year, 1, 2); cursor <= utcDate(year, 12, 30); cursor = new Date(cursor.getTime() + DAY_MS)) {
      const key = toUtcKey(cursor);
      const previous = toUtcKey(new Date(cursor.getTime() - DAY_MS));
      const next = toUtcKey(new Date(cursor.getTime() + DAY_MS));
      if (!holidays.has(key) && holidays.has(previous) && holidays.has(next)) holidays.add(key);
    }
  }

  // 日曜と重なった祝日は、次の祝日でない日を振替休日にする。
  [...holidays].sort().forEach(key => {
    const holiday = new Date(`${key}T00:00:00Z`);
    if (holiday.getUTCDay() !== 0) return;
    let substitute = new Date(holiday.getTime() + DAY_MS);
    while (holidays.has(toUtcKey(substitute))) substitute = new Date(substitute.getTime() + DAY_MS);
    holidays.add(toUtcKey(substitute));
  });

  const startKey = toLocalKey(startDate);
  const endKey = toLocalKey(endDate);
  return [...holidays].filter(key => key >= startKey && key <= endKey).sort();
}
