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
 * 2. Pending alerts (uncorroborated / awaiting admin action):
 *    - Citizen upvotes and fake flags on pending reports do NOT alter the author's account score.
 *    - This completely prevents artificial upvote farming or brigade griefing while unverified.
 * 3. Official Admin Actions:
 *    - When Admin SENDS HELP / Dispatches / Verifies:
 *      * +10 pts for emergency squad dispatched / verified report
 *      * +15 pts for officially resolved & contained report
 *      * Controlled Corroboration bonus: Upvotes gathered on genuine, verified incidents unlock at +1 pt each (capped at +8 pts per incident)
 *    - When Admin MARKS AS FAKE / Disinformation:
 *      * -35 pts severe deduction per false report
 *      * Automatically categorizes user as FLAGGED / LOW TRUST
 * 4. Civic Eyewitness Contribution (voting & comments on other reports):
 *    - +1 pt per vote cast on other incidents (up to +10 pts)
 *    - +1 pt per comment/insight contributed (up to +8 pts)
 * 5. Score Bounds: Clamped strictly between 0 and 100.
 */
/**
 * Checks whether a user is allowed to post new incidents or restricted to voting only.
 * Rules:
 * - Score < 35: Prohibited from posting (can only upvote/review).
 * - Last 3 reports are ALL hoaxes/fake: Prohibited from posting.
 */
export function checkPostingPrivilege({ score = 50, reportedIncidents = [] }) {
  if (score < 35) {
    return {
      canPost: false,
      reason: "Credibility score is below 35. You are currently restricted to voting only.",
      rule: "SCORE_BELOW_35",
      minScore: 35,
    };
  }

  const sorted = [...reportedIncidents].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );

  if (sorted.length >= 3) {
    const last3 = sorted.slice(0, 3);
    const all3Hoax = last3.every((inc) => {
      const s = (inc.status || "").toUpperCase();
      return (
        s.includes("FAKE") ||
        s.includes("DISINFORMATION") ||
        s.includes("HOAX") ||
        s.includes("DEBUNKED")
      );
    });

    if (all3Hoax) {
      return {
        canPost: false,
        reason: "Your last 3 consecutive incident reports were flagged as hoaxes. Posting privileges are suspended.",
        rule: "CONSECUTIVE_HOAXES",
      };
    }
  }

  return {
    canPost: true,
    reason: null,
    rule: "ALLOWED",
  };
}

/**
 * Calculates a strict, mathematically calibrated User Reputation / Credibility Score (0 - 100)
 *
 * Rules:
 * 1. Base Score: 50 (neutral starting baseline)
 * 2. Successful Report Verified by Admin:
 *    - +2 pts for Dispatched / Verified alert
 *    - +3 pts for Officially Resolved & Contained alert
 * 3. False Alert / Hoax Flagged by Admin:
 *    - -6 pts deduction per false alert (range: 5 - 7 pts)
 * 4. Citizen Voter Rewards & Penalties (1 - 3 pts impact based on severity, local proximity, and voter volume):
 *    - When alert is confirmed Genuine:
 *      * Upvoters: awarded +1 to +3 pts for corroborating real emergencies.
 *      * False disputers: penalized -1 to -2 pts for false obstruction.
 *    - When alert is confirmed Hoax:
 *      * Vigilant disputers: awarded +1 to +3 pts for calling out disinformation.
 *      * Misguided upvoters: penalized -1 to -2 pts for amplifying fake alerts.
 * 5. Score Bounds: Clamped strictly between 0 and 100.
 */
export function calculateUserReputation({
  reportedIncidents = [],
  votesCast = 0,
  commentsCount = 0,
  votedIncidents = [], // [{ vote_type, is_local, incident: { category, status, confirm_count, dispute_count } }]
}) {
  const BASE_SCORE = 50;
  let score = BASE_SCORE;
  const breakdown = {
    baseScore: BASE_SCORE,
    resolutionBonus: 0,
    voterBonus: 0,
    voterPenalties: 0,
    disinformationPenalties: 0,
    eyewitnessActivityBonus: 0,
    totalPenalties: 0,
  };

  let totalUpvotesReceived = 0;
  let totalDisputesReceived = 0;
  let resolvedCount = 0;
  let verifiedCount = 0;
  let fakeReportsCount = 0;

  // ── 1. Reporter's Own Submitted Incidents ──────────────────────────────────
  for (const inc of reportedIncidents) {
    const confirms = Number(inc.confirm_count || inc.confirmCount || 0);
    const disputes = Number(inc.dispute_count || inc.disputeCount || 0);
    const status = (inc.status || "").toUpperCase();

    totalUpvotesReceived += confirms;
    totalDisputesReceived += disputes;

    // Admin Flagged as Fake / Disinformation / Hoax (-6 pts penalty)
    if (
      status.includes("FAKE") ||
      status.includes("DISINFORMATION") ||
      status.includes("HOAX") ||
      status.includes("DEBUNKED")
    ) {
      fakeReportsCount++;
      breakdown.disinformationPenalties += 6;
      continue;
    }

    // Admin Sent Help / Verified / Contained (+2 to +3 pts)
    const isResolved =
      status.includes("RESOLVED") || status.includes("CONTAINED");
    const isDispatched =
      status.includes("DISPATCH") ||
      status.includes("EN ROUTE") ||
      status.includes("VERIFIED") ||
      status.includes("CONFIRMED");

    if (isResolved) {
      resolvedCount++;
      breakdown.resolutionBonus += 3; // +3 pts for successful resolution
    } else if (isDispatched) {
      verifiedCount++;
      breakdown.resolutionBonus += 2; // +2 pts for successful dispatch
    }
  }

  // ── 2. User's Eyewitness Voting Accuracy on Other Incidents ────────────────
  // Evaluates votes cast once Admin adjudicates the incident (1 - 3 pts scale)
  for (const v of votedIncidents) {
    const inc = v.incident;
    if (!inc || !inc.status) continue;

    const status = String(inc.status).toUpperCase();
    const category = String(inc.category || "").toUpperCase();
    const isUpvote = v.vote_type === "upvote";
    const isDispute = v.vote_type === "dispute" || v.vote_type === "fake";
    const isLocal = Boolean(v.is_local);
    const totalVotes = Number(inc.confirm_count || 0) + Number(inc.dispute_count || 0);

    // Calculate severity impact (1 - 3 pts)
    let severity = 1;
    if (
      category.includes("DISASTER") ||
      category.includes("MEDICAL") ||
      category.includes("FIRE") ||
      category.includes("SOS")
    ) {
      severity = 3;
    } else if (
      category.includes("CRIME") ||
      category.includes("TRAFFIC") ||
      category.includes("SAFETY") ||
      category.includes("UTILITY") ||
      category.includes("HAZARD")
    ) {
      severity = 2;
    }

    // Boost factor if voter was a verified on-scene local eyewitness or if high-consensus
    let weight = severity;
    if (isLocal && weight < 3) weight += 1;
    if (totalVotes >= 5 && weight < 3) weight += 1;
    const impact = Math.min(3, Math.max(1, weight));

    const isGenuine =
      status.includes("DISPATCH") ||
      status.includes("EN ROUTE") ||
      status.includes("VERIFIED") ||
      status.includes("CONFIRMED") ||
      status.includes("RESOLVED") ||
      status.includes("CONTAINED");

    const isHoax =
      status.includes("FAKE") ||
      status.includes("DISINFORMATION") ||
      status.includes("HOAX") ||
      status.includes("DEBUNKED");

    if (isGenuine) {
      if (isUpvote) {
        // Correct upvote on authentic incident: +1 to +3 pts
        breakdown.voterBonus += impact;
      } else if (isDispute) {
        // False dispute against real emergency: -1 to -2 pts
        breakdown.voterPenalties += Math.min(2, impact);
      }
    } else if (isHoax) {
      if (isDispute) {
        // Vigilant community fraud report: +1 to +3 pts
        breakdown.voterBonus += impact;
      } else if (isUpvote) {
        // Upvoted / amplified false disinformation: -1 to -2 pts
        breakdown.voterPenalties += Math.min(2, impact);
      }
    }
  }

  // Small activity bonus for civic comments
  const commentBonus = Math.min(5, Math.floor(commentsCount * 0.5));
  breakdown.eyewitnessActivityBonus = commentBonus;

  // Calculate total penalties
  breakdown.totalPenalties =
    breakdown.disinformationPenalties + breakdown.voterPenalties;

  // Final score compilation
  score =
    BASE_SCORE +
    breakdown.resolutionBonus +
    breakdown.voterBonus +
    breakdown.eyewitnessActivityBonus -
    breakdown.totalPenalties;

  // Strict clamp between 0 and 100
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  // Check posting privileges
  const privilege = checkPostingPrivilege({
    score: finalScore,
    reportedIncidents,
  });

  // Tier classification
  let tier = "ACTIVE CITIZEN";
  let tierColor = "#f59e0b"; // Amber
  let tierLevel = 2;
  let tierBadge = "Active Citizen";

  if (!privilege.canPost || finalScore < 35) {
    tier = "RESTRICTED / VOTING ONLY";
    tierColor = "#ef4444"; // Red
    tierLevel = 0;
    tierBadge = "Restricted (Voting Only)";
  } else if (finalScore < 50) {
    tier = "PROBATIONARY";
    tierColor = "#f97316"; // Orange
    tierLevel = 1;
    tierBadge = "Probationary";
  } else if (finalScore >= 80) {
    tier = "CIVIC VANGUARD";
    tierColor = "#10b981"; // Emerald
    tierLevel = 4;
    tierBadge = "Civic Vanguard (Elite)";
  } else if (finalScore >= 65) {
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
    postingPrivilege: privilege,
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
      voterBonus: breakdown.voterBonus,
      voterPenalties: breakdown.voterPenalties,
    },
  };
}
