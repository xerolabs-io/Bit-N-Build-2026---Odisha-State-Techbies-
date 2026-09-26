/**
 * Credibility Scoring Engine for Tinggle Civic Alerts
 * Calculates trust score (0-100%) based on community upvotes, proximity bonuses,
 * photographic proof, and official dispatch containment.
 */

// Earth radius in kilometers for Haversine distance
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isLocalVoter(userLat, userLng, incidentLat, incidentLng, maxDistanceKm = 6.0) {
  const dist = calculateDistanceKm(userLat, userLng, incidentLat, incidentLng);
  return dist !== null && dist <= maxDistanceKm;
}

/**
 * Calculates a rigorous, production-grade civic credibility score (0 - 100%)
 * @param {Object} params
 * @param {number} params.upvoteCount - Total confirmed upvotes
 * @param {number} params.localUpvoteCount - Upvotes from citizens physically near the incident
 * @param {boolean} params.hasPhoto - True if citizen photographic evidence is attached
 * @param {string} params.status - Current operational status
 * @param {number} params.disputeCount - Number of citizen disputes
 * @returns {{ score: number, tier: string, badgeColor: string, explanation: string[], isDebunked: boolean }}
 */
export function calculateCredibility({
  upvoteCount = 0,
  localUpvoteCount = 0,
  hasPhoto = false,
  status = "",
  disputeCount = 0,
}) {
  const upperStatus = (status || "").toUpperCase();

  // ─── 0. Check for Administrative Fake News / Disinformation Flag ─────────
  if (
    upperStatus.includes("FAKE") ||
    upperStatus.includes("DISINFORMATION") ||
    upperStatus.includes("DEBUNKED") ||
    upperStatus.includes("HOAX")
  ) {
    return {
      score: 0,
      tier: "DEBUNKED / FAKE NEWS",
      badgeColor: "bg-red-600/30 text-red-300 border-red-500/60",
      explanation: [
        "Flagged as false alert / disinformation by Emergency Command HQ",
        "Community trust revoked: 0% credibility rating",
      ],
      isDebunked: true,
    };
  }

  // ─── Strict Harder Scoring Calibration ─────────────────────────────────────
  // Lower initial confidence requires real community corroboration to build
  let score = 12;
  const explanation = ["Initial uncorroborated citizen broadcast: +12%"];

  // 1. General Community Upvotes (+2.5% per general upvote, max +20%)
  const generalUpvotes = Math.max(0, upvoteCount - localUpvoteCount);
  const generalBonus = Math.min(20, Math.round(generalUpvotes * 2.5));
  if (generalBonus > 0) {
    score += generalBonus;
    explanation.push(`${generalUpvotes} General Upvote(s): +${generalBonus}%`);
  }

  // 2. High-Value On-The-Scene Local Eyewitness Upvotes (+8% each, max +32%)
  const localBonus = Math.min(32, localUpvoteCount * 8);
  if (localBonus > 0) {
    score += localBonus;
    explanation.push(`${localUpvoteCount} Local Eyewitness Corroboration(s): +${localBonus}%`);
  }

  // 3. Photographic Proof Attached (+8%)
  if (hasPhoto) {
    score += 8;
    explanation.push("Citizen Photographic Proof Attached: +8%");
  }

  // 4. Official Authority / Emergency Squad Dispatch (+18%)
  if (
    upperStatus.includes("DISPATCH") ||
    upperStatus.includes("RESOLVED") ||
    upperStatus.includes("CONTAINED") ||
    upperStatus.includes("VERIFIED")
  ) {
    score += 18;
    explanation.push("Official Authority / Emergency Squad Dispatched: +18%");
  }

  // 5. Dispute Penalty (-20% per dispute)
  if (disputeCount > 0) {
    const penalty = Math.min(60, disputeCount * 20);
    score -= penalty;
    explanation.push(`${disputeCount} Citizen Dispute(s): -${penalty}%`);
  }

  // Clamp score between 5% and 98% (or 100% if officially resolved)
  const maxCap = upperStatus.includes("RESOLVED") ? 100 : 96;
  const finalScore = Math.max(5, Math.min(maxCap, Math.round(score)));

  // Determine Rigorous Tier & Badge styling
  let tier = "Low Corroboration / Unverified";
  let badgeColor = "bg-zinc-700/50 text-zinc-400 border-zinc-600";

  if (finalScore >= 80) {
    tier = "High Civic Trust · Corroborated";
    badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  } else if (finalScore >= 55) {
    tier = "Verified Community Alert";
    badgeColor = "bg-sky-500/20 text-sky-300 border-sky-500/40";
  } else if (finalScore >= 30) {
    tier = "Active Community Review";
    badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
  }

  return {
    score: finalScore,
    tier,
    badgeColor,
    explanation,
    isDebunked: false,
  };
}

/**
 * Calculates a strict, mathematically sound User Reputation / Credibility Score (0 - 100)
 *
 * Rules:
 * 1. Base Score: 50 (neutral starting point for registered citizens)
 * 2. Corroborations on user's reports:
 *    - +3 pts per upvote/confirmation (capped at +15 pts per incident)
 *    - +10 pts for reports reaching VERIFIED / DISPATCH status
 *    - +15 pts for reports reaching RESOLVED status
 * 3. Strict Penalties on user's reports:
 *    - -4 pts per dispute vote received
 *    - -12 pts if disputes exceed confirmations on an incident
 *    - -35 pts if incident is flagged as FAKE / DISINFORMATION / HOAX
 * 4. Civic Eyewitness Contribution (voting & comments):
 *    - +1 pt per vote cast on other incidents (up to +15 pts)
 *    - +1 pt per comment/insight contributed (up to +10 pts)
 * 5. Score Bounds: Clamped strictly between 0 and 100.
 */
export function calculateUserReputation({
  reportedIncidents = [],
  votesCast = 0,
  commentsCount = 0,
}) {
  const BASE_SCORE = 50;
  let score = BASE_SCORE;
  const breakdown = {
    baseScore: BASE_SCORE,
    corroborationBonus: 0,
    resolutionBonus: 0,
    eyewitnessActivityBonus: 0,
    disputePenalties: 0,
    disinformationPenalties: 0,
    totalPenalties: 0,
  };

  let totalUpvotesReceived = 0;
  let totalDisputesReceived = 0;
  let resolvedCount = 0;
  let verifiedCount = 0;
  let fakeReportsCount = 0;

  for (const inc of reportedIncidents) {
    const confirms = Number(inc.confirm_count || inc.confirmCount || 0);
    const disputes = Number(inc.dispute_count || inc.disputeCount || 0);
    const status = (inc.status || "").toUpperCase();

    totalUpvotesReceived += confirms;
    totalDisputesReceived += disputes;

    // Disinformation check (severe penalty)
    if (
      status.includes("FAKE") ||
      status.includes("DISINFORMATION") ||
      status.includes("HOAX") ||
      status.includes("DEBUNKED")
    ) {
      fakeReportsCount++;
      breakdown.disinformationPenalties += 35;
      continue;
    }

    // Upvote bonus (capped per report)
    const reportBonus = Math.min(15, confirms * 3);
    breakdown.corroborationBonus += reportBonus;

    // Status bonuses
    if (status.includes("RESOLVED")) {
      resolvedCount++;
      breakdown.resolutionBonus += 15;
    } else if (
      status.includes("VERIFIED") ||
      status.includes("DISPATCH") ||
      status.includes("CONFIRMED")
    ) {
      verifiedCount++;
      breakdown.resolutionBonus += 10;
    }

    // Dispute penalties
    if (disputes > 0) {
      breakdown.disputePenalties += disputes * 4;
      if (disputes > confirms) {
        breakdown.disputePenalties += 12; // Net negative report penalty
      }
    }
  }

  // Eyewitness activity bonus
  const votingBonus = Math.min(15, votesCast * 1);
  const commentBonus = Math.min(10, commentsCount * 1);
  breakdown.eyewitnessActivityBonus = votingBonus + commentBonus;

  // Total penalties
  breakdown.totalPenalties = breakdown.disputePenalties + breakdown.disinformationPenalties;

  // Final score
  score =
    BASE_SCORE +
    breakdown.corroborationBonus +
    breakdown.resolutionBonus +
    breakdown.eyewitnessActivityBonus -
    breakdown.totalPenalties;

  // Strict clamp 0 to 100
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  // Tier classification
  let tier = "ACTIVE CITIZEN";
  let tierColor = "#f59e0b"; // Amber
  let tierLevel = 2;
  let tierBadge = "Active Citizen";

  if (fakeReportsCount > 0 || finalScore < 30) {
    tier = "FLAGGED / LOW TRUST";
    tierColor = "#ef4444"; // Red
    tierLevel = 0;
    tierBadge = "Flagged Citizen";
  } else if (finalScore < 50) {
    tier = "PROBATIONARY";
    tierColor = "#f97316"; // Orange
    tierLevel = 1;
    tierBadge = "Probationary";
  } else if (finalScore >= 90) {
    tier = "CIVIC VANGUARD";
    tierColor = "#10b981"; // Emerald
    tierLevel = 4;
    tierBadge = "Civic Vanguard (Elite)";
  } else if (finalScore >= 75) {
    tier = "TRUSTED EYEWITNESS";
    tierColor = "#38bdf8"; // Sky Blue
    tierLevel = 3;
    tierBadge = "Trusted Eyewitness";
  }

  return {
    score: finalScore,
    tier,
    tierColor,
    tierLevel,
    tierBadge,
    breakdown: {
      ...breakdown,
      finalScore,
    },
    metrics: {
      totalReports: reportedIncidents.length,
      resolvedReports: resolvedCount,
      verifiedReports: verifiedCount,
      fakeReports: fakeReportsCount,
      totalUpvotesReceived,
      totalDisputesReceived,
      votesCast,
      commentsCount,
    },
  };
}
