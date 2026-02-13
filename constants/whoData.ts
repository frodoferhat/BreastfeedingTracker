/**
 * WHO Child Growth Standards — LMS parameters for 0–24 months
 * Source: WHO Multicentre Growth Reference Study (MGRS)
 * https://www.who.int/tools/child-growth-standards/standards
 *
 * Each entry: { ageMonths, L, M, S }
 * L = Box-Cox power, M = median, S = coefficient of variation
 *
 * Percentile formula: X = M × (1 + L × S × Z)^(1/L)
 * Inverse: Z = ((X/M)^L - 1) / (L × S)
 * Percentile = Φ(Z) × 100  (standard normal CDF)
 */

export interface LMSEntry {
  ageMonths: number;
  L: number;
  M: number;
  S: number;
}

// ──────────────────────────────────────────────
// WEIGHT-FOR-AGE (kg), Boys 0–24 months
// ──────────────────────────────────────────────
export const weightBoys: LMSEntry[] = [
  { ageMonths: 0,  L: 0.3487, M: 3.3464, S: 0.14602 },
  { ageMonths: 1,  L: 0.2297, M: 4.4709, S: 0.13395 },
  { ageMonths: 2,  L: 0.1970, M: 5.5675, S: 0.12385 },
  { ageMonths: 3,  L: 0.1738, M: 6.3762, S: 0.11727 },
  { ageMonths: 4,  L: 0.1553, M: 7.0023, S: 0.11316 },
  { ageMonths: 5,  L: 0.1395, M: 7.5105, S: 0.10980 },
  { ageMonths: 6,  L: 0.1257, M: 7.9340, S: 0.10693 },
  { ageMonths: 7,  L: 0.1134, M: 8.2970, S: 0.10441 },
  { ageMonths: 8,  L: 0.1021, M: 8.6151, S: 0.10218 },
  { ageMonths: 9,  L: 0.0917, M: 8.9014, S: 0.10020 },
  { ageMonths: 10, L: 0.0820, M: 9.1649, S: 0.09844 },
  { ageMonths: 11, L: 0.0730, M: 9.4122, S: 0.09688 },
  { ageMonths: 12, L: 0.0644, M: 9.6479, S: 0.09549 },
  { ageMonths: 13, L: 0.0563, M: 9.8749, S: 0.09425 },
  { ageMonths: 14, L: 0.0487, M: 10.0953, S: 0.09314 },
  { ageMonths: 15, L: 0.0413, M: 10.3108, S: 0.09214 },
  { ageMonths: 16, L: 0.0343, M: 10.5228, S: 0.09123 },
  { ageMonths: 17, L: 0.0275, M: 10.7319, S: 0.09040 },
  { ageMonths: 18, L: 0.0211, M: 10.9385, S: 0.08964 },
  { ageMonths: 19, L: 0.0148, M: 11.1430, S: 0.08894 },
  { ageMonths: 20, L: 0.0087, M: 11.3462, S: 0.08829 },
  { ageMonths: 21, L: 0.0029, M: 11.5486, S: 0.08769 },
  { ageMonths: 22, L: -0.0028, M: 11.7504, S: 0.08713 },
  { ageMonths: 23, L: -0.0083, M: 11.9514, S: 0.08661 },
  { ageMonths: 24, L: -0.0137, M: 12.1515, S: 0.08612 },
];

// ──────────────────────────────────────────────
// WEIGHT-FOR-AGE (kg), Girls 0–24 months
// ──────────────────────────────────────────────
export const weightGirls: LMSEntry[] = [
  { ageMonths: 0,  L: 0.3809, M: 3.2322, S: 0.14171 },
  { ageMonths: 1,  L: 0.1714, M: 4.1873, S: 0.13724 },
  { ageMonths: 2,  L: 0.0962, M: 5.1282, S: 0.12635 },
  { ageMonths: 3,  L: 0.0402, M: 5.8458, S: 0.11860 },
  { ageMonths: 4,  L: -0.0050, M: 6.4237, S: 0.11345 },
  { ageMonths: 5,  L: -0.0430, M: 6.8985, S: 0.10938 },
  { ageMonths: 6,  L: -0.0756, M: 7.2970, S: 0.10604 },
  { ageMonths: 7,  L: -0.1039, M: 7.6422, S: 0.10325 },
  { ageMonths: 8,  L: -0.1288, M: 7.9487, S: 0.10090 },
  { ageMonths: 9,  L: -0.1507, M: 8.2254, S: 0.09891 },
  { ageMonths: 10, L: -0.1700, M: 8.4800, S: 0.09722 },
  { ageMonths: 11, L: -0.1872, M: 8.7192, S: 0.09577 },
  { ageMonths: 12, L: -0.2024, M: 8.9481, S: 0.09453 },
  { ageMonths: 13, L: -0.2158, M: 9.1699, S: 0.09346 },
  { ageMonths: 14, L: -0.2278, M: 9.3870, S: 0.09252 },
  { ageMonths: 15, L: -0.2384, M: 9.6008, S: 0.09171 },
  { ageMonths: 16, L: -0.2478, M: 9.8124, S: 0.09099 },
  { ageMonths: 17, L: -0.2562, M: 10.0226, S: 0.09035 },
  { ageMonths: 18, L: -0.2637, M: 10.2315, S: 0.08978 },
  { ageMonths: 19, L: -0.2703, M: 10.4393, S: 0.08927 },
  { ageMonths: 20, L: -0.2762, M: 10.6464, S: 0.08882 },
  { ageMonths: 21, L: -0.2815, M: 10.8534, S: 0.08841 },
  { ageMonths: 22, L: -0.2862, M: 11.0608, S: 0.08805 },
  { ageMonths: 23, L: -0.2903, M: 11.2688, S: 0.08772 },
  { ageMonths: 24, L: -0.2941, M: 11.4775, S: 0.08743 },
];

// ──────────────────────────────────────────────
// LENGTH-FOR-AGE (cm), Boys 0–24 months
// ──────────────────────────────────────────────
export const heightBoys: LMSEntry[] = [
  { ageMonths: 0,  L: 1, M: 49.8842, S: 0.03795 },
  { ageMonths: 1,  L: 1, M: 54.7244, S: 0.03557 },
  { ageMonths: 2,  L: 1, M: 58.4249, S: 0.03424 },
  { ageMonths: 3,  L: 1, M: 61.4292, S: 0.03328 },
  { ageMonths: 4,  L: 1, M: 63.8860, S: 0.03257 },
  { ageMonths: 5,  L: 1, M: 65.9026, S: 0.03204 },
  { ageMonths: 6,  L: 1, M: 67.6236, S: 0.03165 },
  { ageMonths: 7,  L: 1, M: 69.1645, S: 0.03139 },
  { ageMonths: 8,  L: 1, M: 70.5994, S: 0.03124 },
  { ageMonths: 9,  L: 1, M: 71.9687, S: 0.03117 },
  { ageMonths: 10, L: 1, M: 73.2812, S: 0.03118 },
  { ageMonths: 11, L: 1, M: 74.5388, S: 0.03126 },
  { ageMonths: 12, L: 1, M: 75.7488, S: 0.03138 },
  { ageMonths: 13, L: 1, M: 76.9186, S: 0.03154 },
  { ageMonths: 14, L: 1, M: 78.0497, S: 0.03174 },
  { ageMonths: 15, L: 1, M: 79.1458, S: 0.03197 },
  { ageMonths: 16, L: 1, M: 80.2113, S: 0.03222 },
  { ageMonths: 17, L: 1, M: 81.2487, S: 0.03248 },
  { ageMonths: 18, L: 1, M: 82.2587, S: 0.03277 },
  { ageMonths: 19, L: 1, M: 83.2418, S: 0.03307 },
  { ageMonths: 20, L: 1, M: 84.1996, S: 0.03337 },
  { ageMonths: 21, L: 1, M: 85.1348, S: 0.03369 },
  { ageMonths: 22, L: 1, M: 86.0477, S: 0.03401 },
  { ageMonths: 23, L: 1, M: 86.9410, S: 0.03434 },
  { ageMonths: 24, L: 1, M: 87.8161, S: 0.03467 },
];

// ──────────────────────────────────────────────
// LENGTH-FOR-AGE (cm), Girls 0–24 months
// ──────────────────────────────────────────────
export const heightGirls: LMSEntry[] = [
  { ageMonths: 0,  L: 1, M: 49.1477, S: 0.03790 },
  { ageMonths: 1,  L: 1, M: 53.6872, S: 0.03614 },
  { ageMonths: 2,  L: 1, M: 57.0673, S: 0.03568 },
  { ageMonths: 3,  L: 1, M: 59.8029, S: 0.03520 },
  { ageMonths: 4,  L: 1, M: 62.0899, S: 0.03486 },
  { ageMonths: 5,  L: 1, M: 64.0301, S: 0.03463 },
  { ageMonths: 6,  L: 1, M: 65.7311, S: 0.03448 },
  { ageMonths: 7,  L: 1, M: 67.2873, S: 0.03441 },
  { ageMonths: 8,  L: 1, M: 68.7498, S: 0.03440 },
  { ageMonths: 9,  L: 1, M: 70.1435, S: 0.03444 },
  { ageMonths: 10, L: 1, M: 71.4818, S: 0.03452 },
  { ageMonths: 11, L: 1, M: 72.7710, S: 0.03464 },
  { ageMonths: 12, L: 1, M: 74.0153, S: 0.03479 },
  { ageMonths: 13, L: 1, M: 75.2154, S: 0.03496 },
  { ageMonths: 14, L: 1, M: 76.3723, S: 0.03514 },
  { ageMonths: 15, L: 1, M: 77.4880, S: 0.03534 },
  { ageMonths: 16, L: 1, M: 78.5642, S: 0.03555 },
  { ageMonths: 17, L: 1, M: 79.6028, S: 0.03576 },
  { ageMonths: 18, L: 1, M: 80.6051, S: 0.03598 },
  { ageMonths: 19, L: 1, M: 81.5722, S: 0.03621 },
  { ageMonths: 20, L: 1, M: 82.5056, S: 0.03644 },
  { ageMonths: 21, L: 1, M: 83.4065, S: 0.03668 },
  { ageMonths: 22, L: 1, M: 84.2753, S: 0.03693 },
  { ageMonths: 23, L: 1, M: 85.1136, S: 0.03717 },
  { ageMonths: 24, L: 1, M: 85.9235, S: 0.03741 },
];

// ──────────────────────────────────────────────
// HEAD CIRCUMFERENCE-FOR-AGE (cm), Boys 0–24 months
// ──────────────────────────────────────────────
export const headBoys: LMSEntry[] = [
  { ageMonths: 0,  L: 1, M: 34.4618, S: 0.03686 },
  { ageMonths: 1,  L: 1, M: 37.2759, S: 0.03133 },
  { ageMonths: 2,  L: 1, M: 39.1285, S: 0.02997 },
  { ageMonths: 3,  L: 1, M: 40.5135, S: 0.02918 },
  { ageMonths: 4,  L: 1, M: 41.6317, S: 0.02868 },
  { ageMonths: 5,  L: 1, M: 42.5576, S: 0.02837 },
  { ageMonths: 6,  L: 1, M: 43.3306, S: 0.02817 },
  { ageMonths: 7,  L: 1, M: 43.9803, S: 0.02804 },
  { ageMonths: 8,  L: 1, M: 44.5300, S: 0.02796 },
  { ageMonths: 9,  L: 1, M: 44.9998, S: 0.02792 },
  { ageMonths: 10, L: 1, M: 45.4051, S: 0.02790 },
  { ageMonths: 11, L: 1, M: 45.7573, S: 0.02789 },
  { ageMonths: 12, L: 1, M: 46.0661, S: 0.02789 },
  { ageMonths: 13, L: 1, M: 46.3395, S: 0.02789 },
  { ageMonths: 14, L: 1, M: 46.5844, S: 0.02791 },
  { ageMonths: 15, L: 1, M: 46.8060, S: 0.02792 },
  { ageMonths: 16, L: 1, M: 47.0088, S: 0.02795 },
  { ageMonths: 17, L: 1, M: 47.1962, S: 0.02797 },
  { ageMonths: 18, L: 1, M: 47.3711, S: 0.02800 },
  { ageMonths: 19, L: 1, M: 47.5357, S: 0.02803 },
  { ageMonths: 20, L: 1, M: 47.6919, S: 0.02806 },
  { ageMonths: 21, L: 1, M: 47.8408, S: 0.02809 },
  { ageMonths: 22, L: 1, M: 47.9833, S: 0.02813 },
  { ageMonths: 23, L: 1, M: 48.1201, S: 0.02816 },
  { ageMonths: 24, L: 1, M: 48.2515, S: 0.02819 },
];

// ──────────────────────────────────────────────
// HEAD CIRCUMFERENCE-FOR-AGE (cm), Girls 0–24 months
// ──────────────────────────────────────────────
export const headGirls: LMSEntry[] = [
  { ageMonths: 0,  L: 1, M: 33.8787, S: 0.03496 },
  { ageMonths: 1,  L: 1, M: 36.5463, S: 0.03079 },
  { ageMonths: 2,  L: 1, M: 38.2521, S: 0.02963 },
  { ageMonths: 3,  L: 1, M: 39.5328, S: 0.02893 },
  { ageMonths: 4,  L: 1, M: 40.5817, S: 0.02848 },
  { ageMonths: 5,  L: 1, M: 41.4590, S: 0.02817 },
  { ageMonths: 6,  L: 1, M: 42.1995, S: 0.02796 },
  { ageMonths: 7,  L: 1, M: 42.8290, S: 0.02782 },
  { ageMonths: 8,  L: 1, M: 43.3671, S: 0.02773 },
  { ageMonths: 9,  L: 1, M: 43.8300, S: 0.02768 },
  { ageMonths: 10, L: 1, M: 44.2319, S: 0.02766 },
  { ageMonths: 11, L: 1, M: 44.5844, S: 0.02765 },
  { ageMonths: 12, L: 1, M: 44.8965, S: 0.02766 },
  { ageMonths: 13, L: 1, M: 45.1752, S: 0.02768 },
  { ageMonths: 14, L: 1, M: 45.4265, S: 0.02770 },
  { ageMonths: 15, L: 1, M: 45.6551, S: 0.02773 },
  { ageMonths: 16, L: 1, M: 45.8650, S: 0.02776 },
  { ageMonths: 17, L: 1, M: 46.0598, S: 0.02780 },
  { ageMonths: 18, L: 1, M: 46.2424, S: 0.02784 },
  { ageMonths: 19, L: 1, M: 46.4152, S: 0.02788 },
  { ageMonths: 20, L: 1, M: 46.5801, S: 0.02793 },
  { ageMonths: 21, L: 1, M: 46.7384, S: 0.02797 },
  { ageMonths: 22, L: 1, M: 46.8913, S: 0.02802 },
  { ageMonths: 23, L: 1, M: 47.0391, S: 0.02806 },
  { ageMonths: 24, L: 1, M: 47.1822, S: 0.02811 },
];

// ──────────────────────────────────────────────
// PERCENTILE CALCULATOR
// ──────────────────────────────────────────────

/**
 * Standard normal CDF approximation (Abramowitz & Stegun)
 */
function normalCDF(z: number): number {
  if (z < -6) return 0;
  if (z > 6) return 1;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Interpolate LMS values for a given age in months (supports fractional months).
 */
function interpolateLMS(table: LMSEntry[], ageMonths: number): { L: number; M: number; S: number } | null {
  if (ageMonths < 0) return null;

  // Clamp to table range
  const maxAge = table[table.length - 1].ageMonths;
  if (ageMonths > maxAge) return null;

  // Find surrounding entries
  let lower = table[0];
  let upper = table[0];
  for (let i = 0; i < table.length - 1; i++) {
    if (ageMonths >= table[i].ageMonths && ageMonths <= table[i + 1].ageMonths) {
      lower = table[i];
      upper = table[i + 1];
      break;
    }
  }

  if (lower.ageMonths === upper.ageMonths) {
    return { L: lower.L, M: lower.M, S: lower.S };
  }

  // Linear interpolation
  const frac = (ageMonths - lower.ageMonths) / (upper.ageMonths - lower.ageMonths);
  return {
    L: lower.L + frac * (upper.L - lower.L),
    M: lower.M + frac * (upper.M - lower.M),
    S: lower.S + frac * (upper.S - lower.S),
  };
}

/**
 * Calculate the WHO percentile for a given measurement.
 *
 * @param value - The measured value (kg or cm)
 * @param ageMonths - Baby's age in months (fractional OK)
 * @param gender - 'boy' or 'girl'
 * @param metric - 'weight', 'height', or 'head'
 * @returns Percentile (0–100) or null if out of range / unknown gender
 */
export function calculatePercentile(
  value: number,
  ageMonths: number,
  gender: 'boy' | 'girl',
  metric: 'weight' | 'height' | 'head',
): number | null {
  // Pick the right table
  const tables: Record<string, Record<string, LMSEntry[]>> = {
    weight: { boy: weightBoys, girl: weightGirls },
    height: { boy: heightBoys, girl: heightGirls },
    head:   { boy: headBoys,   girl: headGirls },
  };

  const table = tables[metric]?.[gender];
  if (!table) return null;

  const lms = interpolateLMS(table, ageMonths);
  if (!lms) return null;

  const { L, M, S } = lms;

  // Calculate Z-score using LMS method
  let z: number;
  if (Math.abs(L) < 0.001) {
    // When L ≈ 0, use log-normal
    z = Math.log(value / M) / S;
  } else {
    z = (Math.pow(value / M, L) - 1) / (L * S);
  }

  // Convert Z to percentile
  const percentile = normalCDF(z) * 100;

  // Round to nearest integer
  return Math.round(percentile);
}

/**
 * Get a descriptive label for a percentile value
 */
export function getPercentileLabel(percentile: number): {
  text: string;
  color: string;
} {
  if (percentile < 3) return { text: 'Very Low', color: '#D32F2F' };
  if (percentile < 15) return { text: 'Below Average', color: '#F57C00' };
  if (percentile <= 85) return { text: 'Normal', color: '#388E3C' };
  if (percentile <= 97) return { text: 'Above Average', color: '#1976D2' };
  return { text: 'Very High', color: '#7B1FA2' };
}
