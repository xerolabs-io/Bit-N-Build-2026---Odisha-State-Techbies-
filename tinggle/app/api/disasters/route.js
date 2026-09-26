import { NextResponse } from "next/server";

// ── In-memory cache for disaster feeds (5-minute TTL) ────────────────────────
let cache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Fetch with timeout helper
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ── 1. Parse GDACS RSS feed (UN / European Commission) ───────────────────────
// Covers Floods (FL), Tropical Cyclones (TC), Wildfires (WF), Earthquakes (EQ), Volcanoes (VO), Droughts (DR)
async function fetchGdacsDisasters() {
  try {
    const res = await fetchWithTimeout(
      "https://www.gdacs.org/xml/rss.xml",
      { headers: { "User-Agent": "TinggleCivicDisasterTracker/1.0" } },
      8000
    );
    if (!res.ok) return [];

    const xml = await res.text();
    const items = xml.split("<item>").slice(1);
    const events = [];

    for (const it of items) {
      const titleMatch = it.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s);
      const linkMatch = it.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/s);
      const latMatch = it.match(/<geo:lat>(.*?)<\/geo:lat>/);
      const lngMatch = it.match(/<geo:long>(.*?)<\/geo:long>/);
      const typeMatch = it.match(/<gdacs:eventtype>(.*?)<\/gdacs:eventtype>/);
      const levelMatch = it.match(/<gdacs:alertlevel>(.*?)<\/gdacs:alertlevel>/);
      const dateMatch = it.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = it.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/s);
      const eventIdMatch = it.match(/<gdacs:eventid>(.*?)<\/gdacs:eventid>/);

      if (latMatch && lngMatch) {
        const lat = parseFloat(latMatch[1]);
        const lng = parseFloat(lngMatch[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          const typeCode = (typeMatch ? typeMatch[1].trim() : "").toUpperCase();

          let category = "Other";
          let icon = "⚠️";
          let type = "other";

          switch (typeCode) {
            case "FL":
              category = "Flood";
              icon = "🌊";
              type = "flood";
              break;
            case "TC":
              category = "Cyclone";
              icon = "🌀";
              type = "cyclone";
              break;
            case "WF":
              category = "Wildfire";
              icon = "🔥";
              type = "wildfire";
              break;
            case "VO":
              category = "Volcano";
              icon = "🌋";
              type = "volcano";
              break;
            case "DR":
              category = "Drought";
              icon = "🌾";
              type = "drought";
              break;
            case "EQ":
              category = "Earthquake";
              icon = "🌍";
              type = "earthquake";
              break;
            default:
              continue; // Skip unknown codes
          }

          const rawTitle = titleMatch ? titleMatch[1].trim() : `${category} Alert`;
          const cleanTitle = rawTitle.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
          const level = levelMatch ? levelMatch[1].trim() : "Green";

          events.push({
            id: `gdacs_${typeCode}_${eventIdMatch ? eventIdMatch[1] : Math.random().toString(36).substring(2, 8)}`,
            category,
            type,
            icon,
            title: cleanTitle,
            lat,
            lng,
            level, // "Green", "Orange", "Red"
            severityText: `${level.toUpperCase()} ALERT`,
            time: dateMatch ? new Date(dateMatch[1].trim()).toLocaleString() : "Recently Detected",
            date: dateMatch ? dateMatch[1].trim() : "",
            source: "UN GDACS",
            url: linkMatch ? linkMatch[1].trim() : "https://www.gdacs.org",
            description: descMatch
              ? descMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim().slice(0, 180)
              : "",
          });
        }
      }
    }

    return events;
  } catch (err) {
    console.warn("GDACS fetch warning:", err.message);
    return [];
  }
}

// ── 2. Parse USGS Earthquakes Feed (M4.5+ Past Week) ─────────────────────────
async function fetchUsgsEarthquakes() {
  try {
    const res = await fetchWithTimeout(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson",
      {},
      7000
    );
    if (!res.ok) return [];

    const json = await res.json();
    const quakes = (json.features || []).map((f) => {
      const mag = f.properties.mag || 0;
      let level = "Green";
      if (mag >= 6.5) level = "Red";
      else if (mag >= 5.5) level = "Orange";

      return {
        id: `usgs_${f.id}`,
        category: "Earthquake",
        type: "earthquake",
        icon: "🌍",
        title: f.properties.place || `M${mag.toFixed(1)} Earthquake`,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        level,
        severityText: `M${mag.toFixed(1)} · Depth ${f.geometry.coordinates[2] || 10}km`,
        magnitude: mag,
        time: new Date(f.properties.time).toLocaleString(),
        date: new Date(f.properties.time).toISOString(),
        source: "USGS Seismic",
        url: f.properties.url || "https://earthquake.usgs.gov",
        description: `Magnitude ${mag.toFixed(1)} seismic event registered by USGS real-time seismic network.`,
      };
    });

    return quakes;
  } catch (err) {
    console.warn("USGS fetch warning:", err.message);
    return [];
  }
}

// ── 3. Parse NASA EONET Active Events (Tropical Storms, Volcanoes, Wildfires) ─
async function fetchNasaEonetEvents() {
  try {
    const res = await fetchWithTimeout(
      "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=60",
      {},
      8000
    );
    if (!res.ok) return [];

    const json = await res.json();
    const events = [];

    for (const ev of json.events || []) {
      const catId = ev.categories?.[0]?.id || "";
      let category = "Other";
      let icon = "⚠️";
      let type = "other";

      if (catId === "severeStorms") {
        category = "Cyclone";
        icon = "🌀";
        type = "cyclone";
      } else if (catId === "volcanoes") {
        category = "Volcano";
        icon = "🌋";
        type = "volcano";
      } else if (catId === "wildfires") {
        category = "Wildfire";
        icon = "🔥";
        type = "wildfire";
      } else if (catId === "floods") {
        category = "Flood";
        icon = "🌊";
        type = "flood";
      } else {
        continue;
      }

      // Latest geometry observation
      const geom = ev.geometry?.[ev.geometry.length - 1];
      if (!geom) continue;

      let lat = null;
      let lng = null;

      if (geom.type === "Point" && Array.isArray(geom.coordinates)) {
        lng = geom.coordinates[0];
        lat = geom.coordinates[1];
      } else if ((geom.type === "Polygon" || geom.type === "MultiPolygon") && Array.isArray(geom.coordinates)) {
        // Compute centroid
        let latSum = 0, lngSum = 0, count = 0;
        const walk = (arr) => {
          if (typeof arr[0] === "number") {
            lngSum += arr[0]; latSum += arr[1]; count++;
          } else {
            arr.forEach(walk);
          }
        };
        walk(geom.coordinates);
        if (count > 0) {
          lat = latSum / count;
          lng = lngSum / count;
        }
      }

      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        const magVal = geom.magnitudeValue;
        const magUnit = geom.magnitudeUnit || "";
        const severityText = magVal ? `${magVal} ${magUnit}` : "Active Satellite Tracking";

        events.push({
          id: `nasa_${ev.id}`,
          category,
          type,
          icon,
          title: ev.title || `${category} Event`,
          lat,
          lng,
          level: "Orange",
          severityText,
          time: geom.date ? new Date(geom.date).toLocaleString() : "Active Observation",
          date: geom.date || "",
          source: "NASA EONET",
          url: ev.sources?.[0]?.url || ev.link || "https://eonet.gsfc.nasa.gov",
          description: ev.description || `Monitored by NASA Earth Observatory Natural Event Tracker (EONET).`,
        });
      }
    }

    return events;
  } catch (err) {
    console.warn("NASA EONET fetch warning:", err.message);
    return [];
  }
}

// ── GET: Aggregated Disasters Feed ───────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const now = Date.now();

    // Serve from cache if fresh
    if (!forceRefresh && cache.data && now - cache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        data: cache.data,
        counts: cache.counts,
        cached: true,
        total: cache.data.length,
      });
    }

    // Parallel fetch all free APIs
    const [gdacsEvents, usgsQuakes, nasaEvents] = await Promise.all([
      fetchGdacsDisasters(),
      fetchUsgsEarthquakes(),
      fetchNasaEonetEvents(),
    ]);

    // Merge and deduplicate by proximity / title match
    const seen = new Set();
    const merged = [];

    // Prioritize NASA & USGS for high precision, then GDACS
    const all = [...nasaEvents, ...usgsQuakes, ...gdacsEvents];

    for (const ev of all) {
      // Deduplicate key: round lat/lng to 0.5 degrees (~50km) and check category
      const geoKey = `${ev.category}_${Math.round(ev.lat * 2)}_${Math.round(ev.lng * 2)}`;
      if (seen.has(geoKey)) continue;
      seen.add(geoKey);
      merged.push(ev);
    }

    // Calculate category breakdown
    const counts = {
      flood: merged.filter((e) => e.type === "flood").length,
      cyclone: merged.filter((e) => e.type === "cyclone").length,
      wildfire: merged.filter((e) => e.type === "wildfire").length,
      earthquake: merged.filter((e) => e.type === "earthquake").length,
      volcano: merged.filter((e) => e.type === "volcano").length,
      drought: merged.filter((e) => e.type === "drought").length,
      total: merged.length,
    };

    // Store in cache
    cache = {
      data: merged,
      counts,
      timestamp: now,
    };

    return NextResponse.json({
      success: true,
      data: merged,
      counts,
      cached: false,
      total: merged.length,
      sources: ["UN GDACS", "USGS", "NASA EONET"],
    });
  } catch (err) {
    console.error("❌ /api/disasters error:", err.message);
    return NextResponse.json(
      { success: false, error: err.message, data: [] },
      { status: 500 }
    );
  }
}
