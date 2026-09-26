import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    const query = q.trim();

    // 1. Try Photon (Fast OpenStreetMap typeahead engine, free & no key)
    try {
      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`,
        {
          headers: { "User-Agent": "Tinggle/1.0" },
        }
      );

      if (photonRes.ok) {
        const data = await photonRes.json();
        const raw = (data.features || []).map((f) => {
          const p = f.properties;
          const main = p.name || p.city || p.street || query;
          const secondary = [p.city, p.district, p.state, p.country]
            .filter((v) => v && v !== main)
            .filter((v, i, a) => a.indexOf(v) === i)
            .join(", ");
          return {
            id: `ph-${p.osm_id || Math.random()}`,
            name: main,
            secondary: secondary || p.country || "",
            fullLabel: secondary ? `${main}, ${secondary}` : main,
          };
        });

        // Deduplicate suggestions by fullLabel
        const seen = new Set();
        const suggestions = [];
        for (const item of raw) {
          const key = item.fullLabel.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            suggestions.push(item);
          }
        }

        if (suggestions.length > 0) {
          return NextResponse.json({ success: true, suggestions: suggestions.slice(0, 5) });
        }
      }
    } catch (photonErr) {
      console.warn("Photon autocomplete warning:", photonErr.message);
    }

    // 2. Fallback to OpenStreetMap Nominatim (also 100% free)
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&addressdetails=1&limit=5`,
        {
          headers: {
            "User-Agent": "TinggleApp/1.0 (contact: info@tinggle.civic)",
            "Accept-Language": "en",
          },
        }
      );

      if (nomRes.ok) {
        const data = await nomRes.json();
        const suggestions = (data || []).map((item) => {
          const parts = (item.display_name || "").split(",");
          const main = item.name || parts[0]?.trim() || query;
          const secondary = parts.slice(1, 4).join(",").trim();
          return {
            id: `nom-${item.place_id}`,
            name: main,
            secondary,
            fullLabel: secondary ? `${main}, ${secondary}` : main,
          };
        });

        return NextResponse.json({ success: true, suggestions: suggestions.slice(0, 5) });
      }
    } catch (nomErr) {
      console.warn("Nominatim autocomplete warning:", nomErr.message);
    }

    return NextResponse.json({ success: true, suggestions: [] });
  } catch (err) {
    console.error("GET /api/locations/suggest error:", err.message);
    return NextResponse.json({ success: false, suggestions: [], error: err.message });
  }
}
