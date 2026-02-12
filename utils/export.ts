import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { FeedingSession, DiaperLog } from '../types';
import { formatTime } from './time';
import { format, parseISO } from 'date-fns';

const safeParse = (s: string) => parseISO(s.replace(' ', 'T'));

const toMMSS = (seconds: number | null | undefined): string => {
  if (!seconds) return '\u2014';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Generate a clean styled HTML table from feeding sessions (CSV-style data, beautiful look)
 */
export function generateReport(
  sessions: FeedingSession[],
  babyName: string,
  startDate: string,
  endDate: string,
  diaperLogs: DiaperLog[] = []
): string {
  const start = safeParse(startDate);
  const end = safeParse(endDate);
  const dateRange = `${format(start, 'd MMM yyyy')} \u2013 ${format(end, 'd MMM yyyy')}`;
  const exportedAt = format(new Date(), 'dd MMM yyyy, HH:mm');
  const capitalName = babyName.charAt(0).toUpperCase() + babyName.slice(1);

  const rows = sessions.map((session, i) => {
    const date = format(safeParse(session.startTime), 'dd-MM-yyyy');
    const startTime = formatTime(session.startTime);
    const endTime = session.endTime ? formatTime(session.endTime) : '\u2014';
    const durationMin = toMMSS(session.duration);
    const firstMin = toMMSS(session.firstBreastDuration);
    const secondMin = toMMSS(session.secondBreastDuration);
    const breakMin = toMMSS(session.breakDuration);
    const audio = session.audioNotePath ? 'Yes' : 'No';
    const rowBg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    const modeIcon = session.feedingMode === 'bottle' ? '🍼' : '🤱';
    const volumeStr = session.feedingMode === 'bottle' && session.volume != null ? `${session.volume}ml` : '\u2014';

    return `<tr style="background:${rowBg}">
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0">${date}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;text-align:center">${modeIcon}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0">${startTime}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0">${endTime}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;text-align:center;color:#2A9D8F;font-weight:600">${firstMin}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;text-align:center;color:#9B5DE5;font-weight:600">${secondMin}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;text-align:center;color:#D97706;font-weight:600">${breakMin}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;text-align:center;font-weight:700">${durationMin}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;text-align:center;color:#E67E22;font-weight:600">${volumeStr}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;text-align:center">${audio}</td>
    </tr>`;
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feeding Log - ${capitalName}</title>
</head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;color:#1E293B">
  <div style="max-width:650px;margin:0 auto">

    <div style="margin-bottom:20px">
      <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:700;color:#1E293B">Baby: ${capitalName}</h2>
      <p style="margin:0;font-size:14px;color:#64748B">${dateRange}</p>
    </div>

    <div style="background:white;border-radius:10px;overflow:hidden;border:1px solid #E2E8F0">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#F1F5F9">
            <th style="padding:12px 16px;text-align:left;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Date</th>
            <th style="padding:12px 16px;text-align:center;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Type</th>
            <th style="padding:12px 16px;text-align:left;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Start Time</th>
            <th style="padding:12px 16px;text-align:left;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">End Time</th>
            <th style="padding:12px 16px;text-align:center;font-weight:700;color:#2A9D8F;border-bottom:2px solid #CBD5E1">Left Breast</th>
            <th style="padding:12px 16px;text-align:center;font-weight:700;color:#9B5DE5;border-bottom:2px solid #CBD5E1">Right Breast</th>
            <th style="padding:12px 16px;text-align:center;font-weight:700;color:#D97706;border-bottom:2px solid #CBD5E1">Break</th>
            <th style="padding:12px 16px;text-align:center;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Total</th>
            <th style="padding:12px 16px;text-align:center;font-weight:700;color:#E67E22;border-bottom:2px solid #CBD5E1">Volume</th>
            <th style="padding:12px 16px;text-align:center;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Audio Note</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('\n          ')}
        </tbody>
      </table>
    </div>

    ${buildDiaperSection(diaperLogs)}

    <p style="text-align:center;margin-top:16px;font-size:12px;color:#94A3B8">Exported on ${exportedAt}</p>
  </div>
</body>
</html>`;
}

function buildDiaperSection(logs: DiaperLog[]): string {
  if (logs.length === 0) return '';

  // Group logs by date and count daily totals
  const dailyMap = new Map<string, { pee: number; poop: number; total: number }>();
  for (const log of logs) {
    const dateKey = log.createdAt.substring(0, 10);
    const entry = dailyMap.get(dateKey) ?? { pee: 0, poop: 0, total: 0 };
    if (log.type === 'pee' || log.type === 'both') entry.pee++;
    if (log.type === 'poop' || log.type === 'both') entry.poop++;
    entry.total++;
    dailyMap.set(dateKey, entry);
  }

  const sortedDays = [...dailyMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const dayRows = sortedDays.map(([dateKey, counts], i) => {
    const dateLabel = format(safeParse(dateKey), 'dd-MM-yyyy');
    const rowBg = i % 2 === 0 ? '#FFFFFF' : '#FFF8F0';
    return `<tr style="background:${rowBg}">
      <td style="padding:8px 16px;border-bottom:1px solid #E2E8F0">${dateLabel}</td>
      <td style="padding:8px 16px;border-bottom:1px solid #E2E8F0;text-align:center">${counts.pee}</td>
      <td style="padding:8px 16px;border-bottom:1px solid #E2E8F0;text-align:center">${counts.poop}</td>
      <td style="padding:8px 16px;border-bottom:1px solid #E2E8F0;text-align:center;font-weight:600">${counts.total}</td>
    </tr>`;
  });

  return `
    <div style="margin-top:28px;margin-bottom:8px">
      <h3 style="margin:0 0 12px 0;font-size:18px;font-weight:700;color:#1E293B">🧷 Diaper Changes</h3>
      <div style="background:white;border-radius:10px;overflow:hidden;border:1px solid #E2E8F0">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#FFF7ED">
              <th style="padding:10px 16px;text-align:left;font-weight:700;color:#92400E;border-bottom:2px solid #FDE68A">Date</th>
              <th style="padding:10px 16px;text-align:center;font-weight:700;color:#92400E;border-bottom:2px solid #FDE68A">💧 Pee</th>
              <th style="padding:10px 16px;text-align:center;font-weight:700;color:#92400E;border-bottom:2px solid #FDE68A">💩 Poop</th>
              <th style="padding:10px 16px;text-align:center;font-weight:700;color:#92400E;border-bottom:2px solid #FDE68A">🧷 Total</th>
            </tr>
          </thead>
          <tbody>
            ${dayRows.join('\n            ')}
          </tbody>
        </table>
      </div>
    </div>`;
}

/**
 * Export sessions as a styled HTML report and share
 */
export async function exportToCSV(
  sessions: FeedingSession[],
  babyName: string,
  startDate: string,
  endDate: string,
  diaperLogs: DiaperLog[] = []
): Promise<void> {
  const html = generateReport(sessions, babyName, startDate, endDate, diaperLogs);

  const start = safeParse(startDate);
  const end = safeParse(endDate);
  const dateRange = `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`;
  const capitalName = babyName.charAt(0).toUpperCase() + babyName.slice(1);
  const fileName = `${capitalName} Feeding Log (${dateRange}).html`;
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(html);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/html',
      dialogTitle: `Share feeding log for ${babyName}`,
    });
  }
}
