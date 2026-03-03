import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { FeedingSession, DiaperLog, SleepSession } from '../types';
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
 * Generate a clean styled HTML table from feeding sessions
 */
export function generateReport(
  sessions: FeedingSession[],
  babyName: string,
  startDate: string,
  endDate: string,
  diaperLogs: DiaperLog[] = [],
  sleepSessions: SleepSession[] = [],
  forPdf = false
): string {
  const start = safeParse(startDate);
  const end = safeParse(endDate);
  const dateRange = `${format(start, 'd MMM yyyy')} \u2013 ${format(end, 'd MMM yyyy')}`;
  const exportedAt = format(new Date(), 'dd MMM yyyy, HH:mm');
  const capitalName = babyName.charAt(0).toUpperCase() + babyName.slice(1);

  const cellPad = forPdf ? '6px 8px' : '10px 16px';

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
    const noteStr = session.note === 'good' ? '😊 Good' : session.note === 'okay' ? '😐 Okay' : session.note === 'poor' ? '😟 Poor' : session.note ? session.note : '\u2014';

    const sessionNum = sessions.length - i;

    return `<tr style="background:${rowBg}">
      <td style="padding:${cellPad};border-bottom:1px solid #E2E8F0;text-align:center;color:#94A3B8;font-weight:600">${sessionNum}</td>
      <td style="padding:${cellPad};border-bottom:1px solid #E2E8F0">${date}</td>
      <td style="padding:${cellPad};border-bottom:1px solid #E2E8F0;text-align:center">${modeIcon}</td>
      <td style="padding:${cellPad};border-bottom:1px solid #E2E8F0">${startTime}</td>
      <td style="padding:${cellPad};border-bottom:1px solid #E2E8F0">${endTime}</td>
      <td style="padding:${cellPad};border-bottom:1px solid #E2E8F0;text-align:center;color:#2A9D8F;font-weight:600">${firstMin}</td>
      <td style="padding:${cellPad};border-bottom:1px solid #E2E8F0;text-align:center;color:#9B5DE5;font-weight:600">${secondMin}</td>
      <td style="padding:${cellPad};border-bottom:1px solid #E2E8F0;text-align:center;color:#D97706;font-weight:600">${breakMin}</td>
      <td style="padding:${cellPad};border-bottom:1px solid #E2E8F0;text-align:center;font-weight:700">${durationMin}</td>
      <td style="padding:${cellPad};border-bottom:1px solid #E2E8F0;text-align:center;color:#E67E22;font-weight:600">${volumeStr}</td>
      <td style="padding:${cellPad};border-bottom:1px solid #E2E8F0;text-align:center">${audio}</td>
      <td style="padding:${cellPad};border-bottom:1px solid #E2E8F0;font-size:11px;max-width:120px">${noteStr}</td>
    </tr>`;
  });

  const pdfStyles = forPdf ? `
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm;
    }
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
  </style>` : '';

  const fontSize = forPdf ? '11px' : '14px';
  const headPad = forPdf ? '8px 8px' : '12px 16px';
  const maxWidth = forPdf ? '100%' : '650px';
  const bodyPad = forPdf ? '0' : '20px';
  const bgColor = forPdf ? '#FFFFFF' : '#F8FAFC';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feeding Log - ${capitalName}</title>
  ${pdfStyles}
</head>
<body style="margin:0;padding:${bodyPad};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:${bgColor};color:#1E293B">
  <div style="max-width:${maxWidth};margin:0 auto">

    <div style="margin-bottom:${forPdf ? '12px' : '20px'}">
      <h2 style="margin:0 0 4px 0;font-size:${forPdf ? '16px' : '20px'};font-weight:700;color:#1E293B">Baby: ${capitalName}</h2>
      <p style="margin:0;font-size:${forPdf ? '11px' : '14px'};color:#64748B">${dateRange}</p>
    </div>

    <div style="background:white;border-radius:${forPdf ? '4px' : '10px'};overflow:hidden;border:1px solid #E2E8F0">
      <table style="width:100%;border-collapse:collapse;font-size:${fontSize}">
        <thead>
          <tr style="background:#F1F5F9">
            <th style="padding:${headPad};text-align:center;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">#</th>
            <th style="padding:${headPad};text-align:left;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Date</th>
            <th style="padding:${headPad};text-align:center;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Type</th>
            <th style="padding:${headPad};text-align:left;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Start</th>
            <th style="padding:${headPad};text-align:left;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">End</th>
            <th style="padding:${headPad};text-align:center;font-weight:700;color:#2A9D8F;border-bottom:2px solid #CBD5E1">Left</th>
            <th style="padding:${headPad};text-align:center;font-weight:700;color:#9B5DE5;border-bottom:2px solid #CBD5E1">Right</th>
            <th style="padding:${headPad};text-align:center;font-weight:700;color:#D97706;border-bottom:2px solid #CBD5E1">Break</th>
            <th style="padding:${headPad};text-align:center;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Total</th>
            <th style="padding:${headPad};text-align:center;font-weight:700;color:#E67E22;border-bottom:2px solid #CBD5E1">Volume</th>
            <th style="padding:${headPad};text-align:center;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Audio</th>
            <th style="padding:${headPad};text-align:left;font-weight:700;color:#475569;border-bottom:2px solid #CBD5E1">Note</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join('\n          ')}
        </tbody>
      </table>
    </div>

    ${buildDiaperSection(diaperLogs, forPdf)}

    ${buildSleepSection(sleepSessions, forPdf)}

    <p style="text-align:center;margin-top:${forPdf ? '8px' : '16px'};font-size:${forPdf ? '9px' : '12px'};color:#94A3B8">Exported on ${exportedAt}</p>
  </div>
</body>
</html>`;
}

function buildDiaperSection(logs: DiaperLog[], forPdf = false): string {
  if (logs.length === 0) return '';

  const cellPd = forPdf ? '4px 8px' : '8px 16px';
  const headPd = forPdf ? '6px 8px' : '10px 16px';
  const fontSize = forPdf ? '11px' : '14px';

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
      <td style="padding:${cellPd};border-bottom:1px solid #E2E8F0">${dateLabel}</td>
      <td style="padding:${cellPd};border-bottom:1px solid #E2E8F0;text-align:center">${counts.pee}</td>
      <td style="padding:${cellPd};border-bottom:1px solid #E2E8F0;text-align:center">${counts.poop}</td>
      <td style="padding:${cellPd};border-bottom:1px solid #E2E8F0;text-align:center;font-weight:600">${counts.total}</td>
    </tr>`;
  });

  return `
    <div style="margin-top:${forPdf ? '16px' : '28px'};margin-bottom:8px">
      <h3 style="margin:0 0 ${forPdf ? '8px' : '12px'} 0;font-size:${forPdf ? '14px' : '18px'};font-weight:700;color:#1E293B">🧷 Diaper Changes</h3>
      <div style="background:white;border-radius:${forPdf ? '4px' : '10px'};overflow:hidden;border:1px solid #E2E8F0">
        <table style="width:100%;border-collapse:collapse;font-size:${fontSize}">
          <thead>
            <tr style="background:#FFF7ED">
              <th style="padding:${headPd};text-align:left;font-weight:700;color:#92400E;border-bottom:2px solid #FDE68A">Date</th>
              <th style="padding:${headPd};text-align:center;font-weight:700;color:#92400E;border-bottom:2px solid #FDE68A">💧 Pee</th>
              <th style="padding:${headPd};text-align:center;font-weight:700;color:#92400E;border-bottom:2px solid #FDE68A">💩 Poop</th>
              <th style="padding:${headPd};text-align:center;font-weight:700;color:#92400E;border-bottom:2px solid #FDE68A">🧷 Total</th>
            </tr>
          </thead>
          <tbody>
            ${dayRows.join('\n            ')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function buildSleepSection(sessions: SleepSession[], forPdf = false): string {
  if (sessions.length === 0) return '';

  const cellPd = forPdf ? '4px 8px' : '8px 16px';
  const headPd = forPdf ? '6px 8px' : '10px 16px';
  const fontSize = forPdf ? '11px' : '14px';

  const rows = sessions.map((s, i) => {
    const date = format(safeParse(s.startTime), 'dd-MM-yyyy');
    const start = formatTime(s.startTime);
    const end = s.endTime ? formatTime(s.endTime) : '\u2014';
    const dur = toMMSS(s.duration);
    const type = s.sleepType === 'night' ? '🌙 Night' : '☀️ Nap';
    const rowBg = i % 2 === 0 ? '#FFFFFF' : '#F3F0FF';
    const num = sessions.length - i;
    return `<tr style="background:${rowBg}">
      <td style="padding:${cellPd};border-bottom:1px solid #E2E8F0;text-align:center;color:#94A3B8;font-weight:600">${num}</td>
      <td style="padding:${cellPd};border-bottom:1px solid #E2E8F0">${date}</td>
      <td style="padding:${cellPd};border-bottom:1px solid #E2E8F0;text-align:center">${type}</td>
      <td style="padding:${cellPd};border-bottom:1px solid #E2E8F0">${start}</td>
      <td style="padding:${cellPd};border-bottom:1px solid #E2E8F0">${end}</td>
      <td style="padding:${cellPd};border-bottom:1px solid #E2E8F0;text-align:center;font-weight:700;color:#6C5CE7">${dur}</td>
    </tr>`;
  });

  // Summary
  const totalSleeps = sessions.length;
  const totalDur = sessions.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const naps = sessions.filter(s => s.sleepType === 'nap').length;
  const nights = sessions.filter(s => s.sleepType === 'night').length;
  const avgDur = totalSleeps > 0 ? Math.round(totalDur / totalSleeps) : 0;

  const summaryFontSize = forPdf ? '10px' : '13px';

  return `
    <div style="margin-top:${forPdf ? '16px' : '28px'};margin-bottom:8px">
      <h3 style="margin:0 0 ${forPdf ? '8px' : '12px'} 0;font-size:${forPdf ? '14px' : '18px'};font-weight:700;color:#1E293B">😴 Sleep Sessions</h3>

      <div style="display:flex;gap:${forPdf ? '8px' : '12px'};margin-bottom:${forPdf ? '8px' : '14px'};flex-wrap:wrap">
        <span style="font-size:${summaryFontSize};color:#6C5CE7;font-weight:600">${totalSleeps} sleep${totalSleeps !== 1 ? 's' : ''}</span>
        <span style="font-size:${summaryFontSize};color:#94A3B8">·</span>
        <span style="font-size:${summaryFontSize};color:#475569">${toMMSS(totalDur)} total</span>
        <span style="font-size:${summaryFontSize};color:#94A3B8">·</span>
        <span style="font-size:${summaryFontSize};color:#475569">${toMMSS(avgDur)} avg</span>
        ${naps > 0 ? `<span style="font-size:${summaryFontSize};color:#94A3B8">·</span><span style="font-size:${summaryFontSize};color:#F59E0B">☀️ ${naps} nap${naps !== 1 ? 's' : ''}</span>` : ''}
        ${nights > 0 ? `<span style="font-size:${summaryFontSize};color:#94A3B8">·</span><span style="font-size:${summaryFontSize};color:#7C3AED">🌙 ${nights} night${nights !== 1 ? 's' : ''}</span>` : ''}
      </div>

      <div style="background:white;border-radius:${forPdf ? '4px' : '10px'};overflow:hidden;border:1px solid #E2E8F0">
        <table style="width:100%;border-collapse:collapse;font-size:${fontSize}">
          <thead>
            <tr style="background:#F5F3FF">
              <th style="padding:${headPd};text-align:center;font-weight:700;color:#6C5CE7;border-bottom:2px solid #DDD6FE">#</th>
              <th style="padding:${headPd};text-align:left;font-weight:700;color:#6C5CE7;border-bottom:2px solid #DDD6FE">Date</th>
              <th style="padding:${headPd};text-align:center;font-weight:700;color:#6C5CE7;border-bottom:2px solid #DDD6FE">Type</th>
              <th style="padding:${headPd};text-align:left;font-weight:700;color:#6C5CE7;border-bottom:2px solid #DDD6FE">Start</th>
              <th style="padding:${headPd};text-align:left;font-weight:700;color:#6C5CE7;border-bottom:2px solid #DDD6FE">End</th>
              <th style="padding:${headPd};text-align:center;font-weight:700;color:#6C5CE7;border-bottom:2px solid #DDD6FE">Duration</th>
            </tr>
          </thead>
          <tbody>
            ${rows.join('\n            ')}
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
  diaperLogs: DiaperLog[] = [],
  sleepSessions: SleepSession[] = []
): Promise<void> {
  const html = generateReport(sessions, babyName, startDate, endDate, diaperLogs, sleepSessions);

  const start = safeParse(startDate);
  const end = safeParse(endDate);
  const dateRange = `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`;
  const capitalName = babyName.charAt(0).toUpperCase() + babyName.slice(1);
  const fileName = `${capitalName} Baby Log (${dateRange}).html`;
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(html);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/html',
      dialogTitle: `Share baby log for ${babyName}`,
    });
  }
}

/**
 * Export sessions as a PDF report and share
 */
export async function exportToPDF(
  sessions: FeedingSession[],
  babyName: string,
  startDate: string,
  endDate: string,
  diaperLogs: DiaperLog[] = [],
  sleepSessions: SleepSession[] = []
): Promise<void> {
  const html = generateReport(sessions, babyName, startDate, endDate, diaperLogs, sleepSessions, true);

  // Generate PDF from HTML
  const { uri } = await Print.printToFileAsync({
    html,
    width: 842,  // A4 landscape width in points
    height: 595, // A4 landscape height in points
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share report for ${babyName}`,
    });
  }
}
