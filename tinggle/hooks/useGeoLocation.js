"use client";

import { useState, useEffect, useCallback } from "react";

export const GEO_STATES = {
  IDLE: "idle",
  LOCATING: "locating",
  ACQUIRED: "acquired",
  ERROR: "error",
};

// Global shared store so all components (IncidentReportForm, SectorBanner, SpatialRadar, page.js)
// are in complete sync when location is acquired or re-locked.
let globalGeoState = GEO_STATES.IDLE;
let globalLocationText = "Tap ACQUIRE to lock GPS";
let globalCoords = { lat: null, lng: null };
let globalErrorMsg = null;
const subscribers = new Set();
let isAcquiring = false;

function notifySubscribers() {
  const snapshot = {
    geoState: globalGeoState,
    locationText: globalLocationText,
    coords: { ...globalCoords },
    errorMsg: globalErrorMsg,
  };
  subscribers.forEach((callback) => callback(snapshot));
}

export function triggerLocationAcquisition() {
  if (typeof window === "undefined" || !navigator?.geolocation) {
    globalGeoState = GEO_STATES.ERROR;
    globalLocationText = "GPS not supported on this device";
    globalErrorMsg = "Geolocation API unavailable";
    notifySubscribers();
    return;
  }

  isAcquiring = true;
  globalGeoState = GEO_STATES.LOCATING;
  globalLocationText = "Requesting GPS signal & permission...";
  globalErrorMsg = null;
  notifySubscribers();

  // Listen to browser permission state changes if supported
  if (typeof navigator !== "undefined" && navigator.permissions?.query) {
    navigator.permissions
      .query({ name: "geolocation" })
      .then((permissionStatus) => {
        permissionStatus.onchange = () => {
          if (permissionStatus.state === "granted") {
            triggerLocationAcquisition();
          }
        };
      })
      .catch(() => {});
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      isAcquiring = false;
      const { latitude, longitude, accuracy } = position.coords;
      globalCoords = { lat: latitude, lng: longitude };

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

        globalLocationText = `${display} (±${Math.round(accuracy)}m)`;
      } catch {
        globalLocationText = `${latitude.toFixed(5)}°N, ${longitude.toFixed(5)}°E (±${Math.round(accuracy)}m)`;
      }

      globalGeoState = GEO_STATES.ACQUIRED;
      globalErrorMsg = null;
      notifySubscribers();
    },
    (err) => {
      isAcquiring = false;
      globalGeoState = GEO_STATES.ERROR;
      const messages = {
        1: "Location permission declined. Tap RE-LOCK / RETRY or enable in browser settings.",
        2: "GPS signal unavailable",
        3: "Location request timed out",
      };
      const msg = messages[err.code] || "GPS error";
      globalLocationText = msg;
      globalErrorMsg = msg;
      notifySubscribers();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

/**
 * Shared hook for real browser GPS + Nominatim reverse geocoding.
 * Synchronized across the entire application.
 * @param {boolean} autoFetch - if true, fetches on mount automatically if not already acquired
 */
export function useGeoLocation(autoFetch = false) {
  const [state, setState] = useState({
    geoState: globalGeoState,
    locationText: globalLocationText,
    coords: globalCoords,
    errorMsg: globalErrorMsg,
  });

  useEffect(() => {
    const handleUpdate = (snapshot) => {
      setState(snapshot);
    };

    subscribers.add(handleUpdate);

    // Initial sync
    handleUpdate({
      geoState: globalGeoState,
      locationText: globalLocationText,
      coords: globalCoords,
      errorMsg: globalErrorMsg,
    });

    // Auto-fetch if not yet acquired and not currently locating
    if (autoFetch && globalGeoState === GEO_STATES.IDLE && !isAcquiring) {
      triggerLocationAcquisition();
    }

    return () => {
      subscribers.delete(handleUpdate);
    };
  }, [autoFetch]);

  const acquire = useCallback(() => {
    triggerLocationAcquisition();
  }, []);

  return {
    geoState: state.geoState,
    locationText: state.locationText,
    coords: state.coords,
    errorMsg: state.errorMsg,
    acquire,
  };
}
