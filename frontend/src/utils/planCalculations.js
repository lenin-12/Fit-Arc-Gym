/**
 * Shared Client Date Calculation Utility for Plan Metrics
 * Rule: Derives every plan-related number strictly at render time from planStartDate and planExpiryDate.
 * Guarantee: elapsedDays + remainingDays === totalDays
 */

export const calculatePlanMetrics = (planStartDate, planExpiryDate, referenceDate = new Date()) => {
  if (!planStartDate || !planExpiryDate) {
    // Default fallback dates if user doesn't have dates set yet
    const now = new Date(referenceDate);
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const expiry = new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000);
    return calculatePlanMetrics(start, expiry, referenceDate);
  }

  const start = new Date(planStartDate);
  const expiry = new Date(planExpiryDate);
  const ref = new Date(referenceDate);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  // Total duration in days (min 1 day)
  const diffTotalMs = Math.max(0, expiry.getTime() - start.getTime());
  const totalDays = Math.max(1, Math.round(diffTotalMs / MS_PER_DAY));

  // Elapsed days (floor, clamped to 0..totalDays)
  const diffElapsedMs = ref.getTime() - start.getTime();
  const rawElapsed = Math.floor(diffElapsedMs / MS_PER_DAY);
  const elapsedDays = Math.min(totalDays, Math.max(0, rawElapsed));

  // Remaining days (guarantees elapsedDays + remainingDays === totalDays)
  const remainingDays = Math.max(0, totalDays - elapsedDays);

  // Progress Percentage (clamped 0..100)
  const rawProgress = Math.round((elapsedDays / totalDays) * 100);
  const progressPct = Math.min(100, Math.max(0, rawProgress));

  // Current Day (clamped 1..totalDays)
  const currentDay = Math.min(totalDays, Math.max(1, elapsedDays + 1));

  // Status calculation
  let status = 'Active';
  if (remainingDays === 0) {
    status = 'Expired';
  } else if (remainingDays <= 5) {
    status = 'Expiring Soon';
  }

  return {
    elapsedDays,
    totalDays,
    remainingDays,
    progressPct,
    currentDay,
    status
  };
};

export const formatDateUTC = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', // Local IST format
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};
