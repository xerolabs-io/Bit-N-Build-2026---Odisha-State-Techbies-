"use client";

import { useState, useEffect, useCallback } from "react";

export const GEO_STATES = {
  IDLE: "idle",
  LOCATING: "locating",
  ACQUIRED: "acquired",
  ERROR: "error",
};

/**
 * Shared hook for real browser GPS + Nominatim reverse geocoding.
 * @param {boolean} autoFetch - if true, fetches on mount automatically
 */
export function useGeoLocation(autoFetch = false) {
  const [geoState, setGeoState] = useState(GEO_STATES.IDLE);
  const [locationText, setLocationText] = useState("Tap ACQUIRE to lock GPS");
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [errorMsg, setErrorMsg] = useState(null);

  const acquire = useCallback(() => {
    if (!navigator?.geolocation) {
      setGeoState(GEO_STATES.ERROR);
      setLocationText("GPS not supported on this device");
      setErrorMsg("Geolocation API unavailable");
      return;
    }

    setGeoState(GEO_STATES.LOCATING);
    setLocationText("Acquiring GPS signal...");
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        // Reverse geocode with free Nominatim (no API key needed)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=16`,
            { headers: { "Accept-Language": "en" } }
          );
          const geo = await res.json();
          const addr = geo.address || {};
          const area =
            addr.suburb ||
            addr.neighbourhood ||
            addr.city_district ||
            addr.village ||
            addr.town ||
            addr.city ||
            "Unknown area";
          const road = addr.road || addr.pedestrian || "";
          const city = addr.city || addr.town || addr.state || "";
          const display = road
            ? `${road}, ${area}${city && city !== area ? `, ${city}` : ""}`
            : `${area}${city && city !== area ? `, ${city}` : ""}`;

          setLocationText(`${display} (±${Math.round(accuracy)}m)`);
        } catch {
          // Fallback to raw coordinates
          setLocationText(
            `${latitude.toFixed(5)}°N, ${longitude.toFixed(5)}°E (±${Math.round(accuracy)}m)`
          );
        }

        setGeoState(GEO_STATES.ACQUIRED);
      },
      (err) => {
        setGeoState(GEO_STATES.ERROR);
        const messages = {
          1: "Location permission denied",
          2: "GPS signal unavailable",
          3: "Location request timed out",
        };
        const msg = messages[err.code] || "GPS error";
        setLocationText(msg);
        setErrorMsg(msg);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  // Auto-fetch on mount if requested
  useEffect(() => {
    if (autoFetch) acquire();
  }, [autoFetch, acquire]);

  return { geoState, locationText, coords, errorMsg, acquire };
}
