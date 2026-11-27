export type BvcMarketSessionStatus =
  | 'OPEN'
  | 'PRE_OPEN'
  | 'CLOSED_AFTER_HOURS'
  | 'CLOSED_WEEKEND';

export interface BvcMarketStatusInfo {
  status: BvcMarketSessionStatus;
  label: string;
  shortLabel: string;
  hoursLabel: string;
  isOpen: boolean;
  casablancaTime: string;
}

/**
 * Calcule le statut de séance en direct de la Bourse de Casablanca (fuseau Africa/Casablanca) :
 * - Lundi–Vendredi 09h00–09h29 : Pré-ouverture
 * - Lundi–Vendredi 09h30–15h40 : Séance continue ouverte
 * - Hors séance / Week-end     : Marché clôturé
 */
export function getBvcMarketStatus(now: Date = new Date()): BvcMarketStatusInfo {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Casablanca',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekdayRaw = parts.find((p) => p.type === 'weekday')?.value || '';
  const hourNum = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
  const minuteNum = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  const casablancaTime = `${String(hourNum).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}`;
  const isWeekend = weekdayRaw === 'Sat' || weekdayRaw === 'Sun';

  if (isWeekend) {
    return {
      status: 'CLOSED_WEEKEND',
      label: 'MARCHÉ BVC FERMÉ (WEEK-END)',
      shortLabel: 'WEEK-END BVC',
      hoursLabel: '09h30 – 15h40 (Casablanca)',
      isOpen: false,
      casablancaTime,
    };
  }

  const minutesSinceMidnight = hourNum * 60 + minuteNum;
  const PRE_OPEN_START = 9 * 60; // 09:00
  const CONTINUOUS_START = 9 * 60 + 30; // 09:30
  const CONTINUOUS_END = 15 * 60 + 40; // 15:40

  if (minutesSinceMidnight >= CONTINUOUS_START && minutesSinceMidnight <= CONTINUOUS_END) {
    return {
      status: 'OPEN',
      label: 'SÉANCE BVC OUVERTE',
      shortLabel: 'BVC OUVERTE',
      hoursLabel: '09h30 – 15h40 (Casablanca)',
      isOpen: true,
      casablancaTime,
    };
  }

  if (minutesSinceMidnight >= PRE_OPEN_START && minutesSinceMidnight < CONTINUOUS_START) {
    return {
      status: 'PRE_OPEN',
      label: 'PRÉ-OUVERTURE BVC',
      shortLabel: 'PRÉ-OUVERTURE',
      hoursLabel: '09h30 – 15h40 (Casablanca)',
      isOpen: false,
      casablancaTime,
    };
  }

  return {
    status: 'CLOSED_AFTER_HOURS',
    label: 'MARCHÉ BVC CLÔTURÉ',
    shortLabel: 'BVC CLÔTURÉE',
    hoursLabel: '09h30 – 15h40 (Casablanca)',
    isOpen: false,
    casablancaTime,
  };
}
