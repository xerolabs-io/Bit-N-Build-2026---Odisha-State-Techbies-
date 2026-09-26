import { NextResponse } from "next/server";
import supabase from "@/lib/db.lib";
import { isLocalVoter, calculateCredibility } from "@/lib/credibility.lib";

// ── GET /api/incidents/[id]/vote?email=user@example.com ───────────────────────
// Returns whether this user has already cast a vote on this incident.
// Used by the frontend on page load to sync hasVoted state from the DB
// (works cross-device, cross-browser, incognito — no localStorage dependency).
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.toLowerCase().trim();

    if (!id || !email) {
      return NextResponse.json(
        { success: false, hasVoted: false, voteType: null },
        { status: 400 }
      );
    }

    const { data: vote } = await supabase
      .from("incident_votes")
      .select("vote_type, is_local")
      .eq("incident_id", id)
      .eq("voter_email", email)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      hasVoted: Boolean(vote),
      voteType: vote?.vote_type ?? null,
      isLocal: vote?.is_local ?? false,
    });
  } catch (err) {
    console.error("GET /api/incidents/[id]/vote error:", err.message);
    return NextResponse.json(
      { success: false, hasVoted: false, voteType: null },
      { status: 500 }
    );
  }
}


export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { userEmail, userLat, userLng, voteType = "upvote" } = body;

    // ── Require authenticated user ─────────────────────────────────────────
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Incident ID is required." },
        { status: 400 }
      );
    }
    if (
      !userEmail ||
      typeof userEmail !== "string" ||
      !userEmail.includes("@")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be signed in to vote on an incident.",
        },
        { status: 401 }
      );
    }

    const normalizedEmail = userEmail.toLowerCase().trim();

    // ── 1. Fetch incident ─────────────────────────────────────────────────
    const { data: incident, error: fetchErr } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !incident) {
      return NextResponse.json(
        { success: false, error: "Incident not found." },
        { status: 404 }
      );
    }

    // ── 2. Block reporter from voting their own report ─────────────────────
    if (
      incident.reporter_email &&
      normalizedEmail === incident.reporter_email.toLowerCase().trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You cannot upvote your own incident report.",
          isOwner: true,
        },
        { status: 403 }
      );
    }

    // ── 3. Check for duplicate vote (Bug #2 & #5 fix) ─────────────────────
    const { data: existingVote } = await supabase
      .from("incident_votes")
      .select("id, vote_type")
      .eq("incident_id", id)
      .eq("voter_email", normalizedEmail)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json(
        {
          success: false,
          error:
            existingVote.vote_type === voteType
              ? `You have already ${voteType}d this incident.`
              : "You have already cast a vote on this incident.",
          alreadyVoted: true,
        },
        { status: 409 }
      );
    }

    // ── 4. Determine proximity (Bug #4 fix — track real is_local) ─────────
    const isLocal = isLocalVoter(
      userLat,
      userLng,
      incident.latitude,
      incident.longitude
    );

    // ── 5. Record vote in incident_votes table ─────────────────────────────
    const { error: voteInsertErr } = await supabase
      .from("incident_votes")
      .insert({
        incident_id: id,
        voter_email: normalizedEmail,
        vote_type: voteType,
        is_local: isLocal,
      });

    if (voteInsertErr) {
      // Handle race-condition duplicate (concurrent request) gracefully
      if (voteInsertErr.code === "23505") {
        return NextResponse.json(
          { success: false, error: "You have already voted on this incident.", alreadyVoted: true },
          { status: 409 }
        );
      }
      console.error("Vote insert error:", voteInsertErr.message);
      return NextResponse.json(
        { success: false, error: voteInsertErr.message },
        { status: 500 }
      );
    }

    // ── 6. Tally actual vote counts from incident_votes table ──────────────
    const { data: voteCounts } = await supabase
      .from("incident_votes")
      .select("vote_type, is_local")
      .eq("incident_id", id);

    const totalUpvotes = (voteCounts || []).filter(
      (v) => v.vote_type === "upvote"
    ).length;
    const localUpvotes = (voteCounts || []).filter(
      (v) => v.vote_type === "upvote" && v.is_local
    ).length;
    const totalDisputes = (voteCounts || []).filter(
      (v) => v.vote_type === "dispute"
    ).length;

    // ── 7. Recalculate credibility with real numbers ───────────────────────
    const cred = calculateCredibility({
      upvoteCount: totalUpvotes,
      localUpvoteCount: localUpvotes,   // ← actual tracked local votes
      hasPhoto: Boolean(incident.image_url),
      status: incident.status,
      disputeCount: totalDisputes,
    });

    const newTrustScore = `CIVIC TRUST: ${cred.score}% (${cred.tier})`;

    // ── 8. Update incident aggregate counts ───────────────────────────────
    const { data: updated, error: updateErr } = await supabase
      .from("incidents")
      .update({
        confirm_count: totalUpvotes,
        dispute_count: totalDisputes,
        trust_score: newTrustScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateErr) {
      console.error("Supabase vote update error:", updateErr.message);
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      isLocal,
      credibility: cred,
      message: isLocal
        ? "📍 Local Upvote recorded! +8% Proximity Credibility applied."
        : "✅ Community Upvote recorded!",
    });
  } catch (err) {
    console.error("POST /api/incidents/[id]/vote error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
