import { MemorizationItem } from '../types';

export type ReviewRating = 1 | 2 | 3 | 4;

export interface SRSResult {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  streak: number;
  nextReviewAt: string;
  status: 'new' | 'learning' | 'review' | 'mastered';
}

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 * @param currentItem Current item SRS state
 * @param quality 1: Again (จำไม่ได้), 2: Hard (ยาก), 3: Good (จำได้), 4: Easy (จำได้แม่นยำ)
 */
export function calculateNextSRS(
  currentItem: Pick<MemorizationItem, 'repetitions' | 'intervalDays' | 'easeFactor' | 'streak'>,
  quality: ReviewRating
): SRSResult {
  let repetitions = currentItem.repetitions || 0;
  let intervalDays = currentItem.intervalDays || 1;
  let easeFactor = currentItem.easeFactor || 2.5;
  let streak = currentItem.streak || 0;
  let status: 'new' | 'learning' | 'review' | 'mastered' = 'learning';

  if (quality < 2) {
    // Again / Fail
    repetitions = 0;
    streak = 0;
    intervalDays = 0.01; // ~15 minutes (review again today)
    status = 'learning';
  } else {
    // Success
    repetitions += 1;
    streak += 1;

    if (repetitions === 1) {
      intervalDays = quality === 4 ? 3 : 1;
    } else if (repetitions === 2) {
      intervalDays = quality === 4 ? 6 : 3;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }

    // Adjust ease factor
    const qScore = quality === 4 ? 5 : (quality === 3 ? 4 : 3);
    easeFactor = easeFactor + (0.1 - (5 - qScore) * (0.08 + (5 - qScore) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    if (repetitions >= 4 && streak >= 3) {
      status = 'mastered';
    } else {
      status = 'review';
    }
  }

  const nextReviewDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  return {
    repetitions,
    intervalDays: Math.max(1, Math.round(intervalDays)),
    easeFactor: Math.round(easeFactor * 100) / 100,
    streak,
    nextReviewAt: nextReviewDate.toISOString(),
    status
  };
}

/**
 * Format relative time for next review (e.g. "วันนี้", "พรุ่งนี้", "อีก 3 วัน")
 */
export function formatNextReview(dateIsoString?: string): { label: string; isDue: boolean; color: string } {
  if (!dateIsoString) {
    return { label: 'ต้องทบทวน', isDue: true, color: 'text-red-500' };
  }

  const now = Date.now();
  const target = new Date(dateIsoString).getTime();
  const diffMs = target - now;

  if (diffMs <= 0) {
    return { label: 'ถึงกำหนดทบทวนแล้ว', isDue: true, color: 'text-red-500' };
  }

  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) {
    return { label: `อีก ${diffHours} ชม.`, isDue: false, color: 'text-amber-500' };
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) {
    return { label: 'พรุ่งนี้', isDue: false, color: 'text-amber-500' };
  }

  return { label: `อีก ${diffDays} วัน`, isDue: false, color: 'text-emerald-600' };
}
