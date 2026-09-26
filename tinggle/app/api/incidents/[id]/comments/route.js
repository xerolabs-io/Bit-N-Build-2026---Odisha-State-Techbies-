import { NextResponse } from "next/server";
import supabase from "@/lib/db.lib";

// In-memory fallback cache if Supabase table incident_comments is not yet provisioned
const fallbackCommentsStore = new Map();

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const incidentId = String(id);

    // Try Supabase table first
    const { data, error } = await supabase
      .from("incident_comments")
      .select("*")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: true });

    if (!error && Array.isArray(data)) {
      const parsedComments = data.map((c) => {
        let img = c.image_url || null;
        let ext = c.extra_details;
        if (!img && ext && typeof ext === "string" && ext.startsWith("{")) {
          try {
            const parsed = JSON.parse(ext);
            if (parsed && parsed.img) {
              img = parsed.img;
              ext = parsed.text || null;
            }
          } catch (e) {}
        }
        return {
          ...c,
          extra_details: ext,
          image_url: img,
        };
      });
      return NextResponse.json({ success: true, comments: parsedComments });
    }

    // Fallback cache
    const cached = fallbackCommentsStore.get(incidentId) || [];
    return NextResponse.json({ success: true, comments: cached });
  } catch (err) {
    console.error("GET /api/incidents/[id]/comments error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message, comments: [] },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const incidentId = String(id);
    const body = await req.json().catch(() => ({}));
    const {
      authorName,
      authorEmail,
      content,
      isLocal = false,
      extraDetails = null,
      imageUrl = null,
    } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Comment content is required." },
        { status: 400 }
      );
    }

    const newComment = {
      id: "c_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      incident_id: incidentId,
      author_name: authorName || "Citizen Reporter",
      author_email: authorEmail || null,
      content: content.trim(),
      is_local: Boolean(isLocal),
      extra_details: extraDetails || null,
      image_url: imageUrl || null,
      created_at: new Date().toISOString(),
    };

    // Try persisting to Supabase
    try {
      // 1. Try with direct image_url column
      const { data, error } = await supabase
        .from("incident_comments")
        .insert([newComment])
        .select("*")
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, comment: data });
      }

      // 2. If column image_url does not exist in schema cache, store in extra_details
      if (error && error.message?.includes("image_url")) {
        const fallbackComment = { ...newComment };
        delete fallbackComment.image_url;
        if (imageUrl) {
          fallbackComment.extra_details = JSON.stringify({
            text: extraDetails || null,
            img: imageUrl,
          });
        }
        const { data: data2, error: error2 } = await supabase
          .from("incident_comments")
          .insert([fallbackComment])
          .select("*")
          .single();

        if (!error2 && data2) {
          return NextResponse.json({
            success: true,
            comment: {
              ...data2,
              extra_details: extraDetails || null,
              image_url: imageUrl,
            },
          });
        }
      }
    } catch (e) {
      // Table may not exist yet, fallback to cache
    }

    // Fallback in-memory store
    const list = fallbackCommentsStore.get(incidentId) || [];
    list.push(newComment);
    fallbackCommentsStore.set(incidentId, list);

    return NextResponse.json({ success: true, comment: newComment });
  } catch (err) {
    console.error("POST /api/incidents/[id]/comments error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
