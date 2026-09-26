import { NextResponse } from "next/server";
import supabase from "@/lib/db.lib";
import { findUserByEmail, saveOrUpdateUser } from "@/lib/users.lib";
import { calculateUserReputation } from "@/lib/credibility.lib";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email parameter is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Fetch or create user record
    let user = await findUserByEmail(normalizedEmail);
    if (!user) {
      const created = await saveOrUpdateUser({
        email: normalizedEmail,
        displayName: normalizedEmail.split("@")[0],
        reputation: 50,
      });
      user = created.user;
    }

    // 2. Fetch all incidents reported by this user
    const { data: userIncidents, error: incError } = await supabase
      .from("incidents")
      .select("*")
      .eq("reporter_email", normalizedEmail)
      .order("created_at", { ascending: false });

    if (incError) {
      console.error("❌ Error fetching user incidents:", incError.message);
    }

    const incidents = userIncidents || [];

    // 3. Fetch votes cast by this user on other incidents
    const { data: userVotes, error: voteError } = await supabase
      .from("incident_votes")
      .select("id, incident_id, vote_type, is_local, voted_at")
      .eq("voter_email", normalizedEmail);

    if (voteError) {
      console.warn("Vote fetch notice:", voteError.message);
    }

    const votes = userVotes || [];

    // 4. Fetch comments posted by this user
    const { count: commentCount, error: commentError } = await supabase
      .from("incident_comments")
      .select("id", { count: "exact", head: true })
      .eq("author_email", normalizedEmail);

    if (commentError) {
      console.warn("Comment count notice:", commentError.message);
    }

    // 5. Calculate strict, mathematically sound credibility / reputation score
    const reputationAnalysis = calculateUserReputation({
      reportedIncidents: incidents,
      votesCast: votes.length,
      commentsCount: commentCount || 0,
    });

    const calculatedScore = reputationAnalysis.score;

    // 6. Update reputation in database if changed
    if (user.reputation !== calculatedScore) {
      supabase
        .from("users")
        .update({
          reputation: calculatedScore,
          updated_at: new Date().toISOString(),
        })
        .eq("email", normalizedEmail)
        .then(() => {
          console.log(`✅ Synced reputation for ${normalizedEmail} -> ${calculatedScore}`);
        })
        .catch((e) => {
          console.error("Reputation update error:", e.message);
        });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        reputation: calculatedScore,
        tier: reputationAnalysis.tier,
        tierBadge: reputationAnalysis.tierBadge,
        tierColor: reputationAnalysis.tierColor,
        tierLevel: reputationAnalysis.tierLevel,
        isAdmin: Boolean(user.is_admin || user.admin),
        createdAt: user.created_at,
        watchlist: user.watchlist || [],
      },
      credibility: reputationAnalysis,
      incidents,
      activity: {
        votesCastCount: votes.length,
        commentsCount: commentCount || 0,
        recentVotes: votes.slice(0, 10),
      },
    });
  } catch (err) {
    console.error("❌ /api/user/profile error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
