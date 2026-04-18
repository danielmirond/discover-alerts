export interface SpikeItem {
  score: number;
  position: number;
  publications: number;
}

export interface SpikeSnapshot {
  score: number;
  position: number;
  publications: number;
  lastUpdated: string;
}

export interface SpikeAlert<T extends string, K extends string> {
  type: T;
  subtype: 'new' | 'spike';
  key: K;
  score: number;
  prevScore: number;
  position: number;
  prevPosition: number;
  publications: number;
  prevPublications: number;
}

export interface SpikeThresholds {
  scoreJump: number;
  newMinScore: number;
  publicationsJumpPct: number;
}

export function computeSpike<T extends string, K extends string>(
  type: T,
  key: K,
  current: SpikeItem,
  previous: SpikeSnapshot | undefined,
  thresholds: SpikeThresholds,
): SpikeAlert<T, K> | null {
  if (!previous) {
    if (current.score < thresholds.newMinScore) return null;
    return {
      type,
      subtype: 'new',
      key,
      score: current.score,
      prevScore: 0,
      position: current.position,
      prevPosition: 0,
      publications: current.publications,
      prevPublications: 0,
    };
  }

  const scoreDelta = current.score - previous.score;
  const pubIncrease = previous.publications > 0
    ? (current.publications - previous.publications) / previous.publications
    : 0;

  if (scoreDelta < thresholds.scoreJump && pubIncrease < thresholds.publicationsJumpPct) {
    return null;
  }

  return {
    type,
    subtype: 'spike',
    key,
    score: current.score,
    prevScore: previous.score,
    position: current.position,
    prevPosition: previous.position,
    publications: current.publications,
    prevPublications: previous.publications,
  };
}
