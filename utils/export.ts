import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { FeedingSession } from '../types';
import { formatTime } from './time';
import { format, parseISO } from 'date-fns';

const toMMSS = (seconds: number | null | undefined): string => {
  if (!seconds) return '\u2014';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Generate a clean styled HTML table from feeding sessions (CSV-style data, beautiful look)
 */
export function generateReport(sessions: FeedingSession[], babyName: string, startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const dateRange = `${format(start, 'd MMM yyyy')} \u2013 ${format(end, 'd MMM yyyy')}`;
  const exportedAt = format(new Date(), 'dd MMM yyyy, HH:mm');
  const capitalName = babyName.charAt(0).toUpperCase() + babyName.slice(1);

  const rows = sessions.map((session, i) => {
    const date = format(parseISO(session.startTime), 'dd-MM-yyyy');
    const startTime = formatTime(session.startTime);
    const endTime = session.endTime ? formatTime(session.endTime) : '\u2014';
    const durationMin = toMMSS(session.duration);
    const firstMin = toMMSS(session.firstBreastDuration);
    const secondMin = toMMSS(session.secondBreastDuration);
    const breakMin = toMMSS(session.breakDuration);
    const audio = session.audioNotePath ? 'Yes' : 'No';
    const rowBg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

    return `<tr style="background:${rowBg}">
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0">${date}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0">${startTime}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0">${endTime}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;text-align:center;color:#2A9D8F;font-weight:600">${firstMin}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;text-align:center;color:#9B5DE5;font-weight:600">${secondMin}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;text-align:center;color:#D97706;font-weight:600">${breakMin}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #E2E8F0;text-align:center;font-weight:700">${durationMin}</td>
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
            <th style="padding:12px 16px;text-align:left;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Start Time</th>
            <th style="padding:12px 16px;text-align:left;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">End Time</th>
            <th style="padding:12px 16px;text-align:center;font-weight:700;color:#2A9D8F;border-bottom:2px solid #CBD5E1">1st Breast</th>
            <th style="padding:12px 16px;text-align:center;font-weight:700;color:#9B5DE5;border-bottom:2px solid #CBD5E1">2nd Breast</th>
            <th style="padding:12px 16px;text-align:center;font-weight:700;color:#D97706;border-bottom:2px solid #CBD5E1">Break</th>
            <th style="padding:12px 16px;text-align:center;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Total</th>
            <th style="padding:12px 16px;text-align:center;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Audio Note</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('\n          ')}
        </tbody>
      </table>
    </div>

    <p style="text-align:center;margin-top:16px;font-size:12px;color:#94A3B8">Exported on ${exportedAt}</p>
  </div>
</body>
</html>`;
}

/**
 * Export sessions as a styled HTML report and share
 */
export async function exportToCSV(
  sessions: FeedingSession[],
  babyName: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const html = generateReport(sessions, babyName, startDate, endDate);

  const start = parseISO(startDate);
  const end = parseISO(endDate);
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
