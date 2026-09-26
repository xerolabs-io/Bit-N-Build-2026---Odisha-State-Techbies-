/**
 * Phone Number & Emergency Telemetry Security Library
 * Validates phone numbers, filters dummy/repetitive numbers,
 * provides anti-spam cooldown, and handles emergency nonces.
 */

// ── In-Memory SOS Rate Limiting Store ─────────────────────────────────────────
// Maps IP or device token to last SOS timestamp (persists in process memory)
const sosRateLimitMap = new Map();
const RATE_LIMIT_COOLDOWN_MS = 45 * 1000; // 45 seconds cooldown between SOS broadcasts per device/IP

/**
 * Validates phone numbers rigorously:
 * - Checks 10-15 digit length (E.164 standard)
 * - Rejects all-zeroes, repetitive digits (e.g., 0000000000, 1111111111)
 * - Rejects sequential test patterns (e.g., 1234567890, 9876543210)
 * - Validates starting mobile digits for 10-digit Indian numbers (6, 7, 8, 9)
 * - Formats cleaned phone with standard prefix
 */
export function validatePhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      isValid: false,
      error: "Phone number is required.",
      cleanPhone: null,
    };
  }

  const trimmed = rawPhone.trim();
  // Strip spaces, dashes, brackets, dots
  const stripped = trimmed.replace(/[\s\-\(\)\.]/g, "");
  // Extract all digits and optional leading plus
  const digitsOnly = stripped.replace(/[^\d]/g, "");

  // 1. Length validation (10 to 15 digits)
  if (digitsOnly.length < 10) {
    return {
      isValid: false,
      error: `Phone number is too short (${digitsOnly.length} digits). Minimum 10 digits required.`,
      cleanPhone: null,
    };
  }

  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      error: `Phone number is too long (${digitsOnly.length} digits). Maximum 15 digits allowed.`,
      cleanPhone: null,
    };
  }

  // 2. Reject obvious repetitive digits (e.g. 0000000000, 1111111111, 9999999999)
  const isAllSameDigit = /^(\d)\1{9,}$/.test(digitsOnly);
  if (isAllSameDigit) {
    return {
      isValid: false,
      error: "Invalid phone number: Repetitive dummy digits are not allowed.",
      cleanPhone: null,
    };
  }

  // 3. Reject sequential dummy numbers (1234567890, 0123456789, 9876543210)
  const sequentialPatterns = [
    "1234567890",
    "0123456789",
    "9876543210",
    "0987654321",
    "1234512345",
  ];
  if (sequentialPatterns.some((pattern) => digitsOnly.includes(pattern))) {
    return {
      isValid: false,
      error: "Invalid phone number: Test sequence patterns (e.g., 1234567890) are not permitted.",
      cleanPhone: null,
    };
  }

  // 4. For standard 10-digit numbers without country code (common in India)
  if (digitsOnly.length === 10) {
    const firstDigit = digitsOnly[0];
    if (!["6", "7", "8", "9"].includes(firstDigit)) {
      return {
        isValid: false,
        error: "Invalid mobile number: 10-digit mobile numbers must start with 6, 7, 8, or 9.",
        cleanPhone: null,
      };
    }
  }

  // 5. If 12 digits starting with 91 (India with country code)
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    const mobileFirstDigit = digitsOnly[2];
    if (!["6", "7", "8", "9"].includes(mobileFirstDigit)) {
      return {
        isValid: false,
        error: "Invalid mobile number: Indian mobile numbers must start with 6, 7, 8, or 9 after +91.",
        cleanPhone: null,
      };
    }
  }

  // Normalize format with optional leading '+'
  const formattedPhone = stripped.startsWith("+") ? `+${digitsOnly}` : digitsOnly;

  return {
    isValid: true,
    error: null,
    cleanPhone: formattedPhone,
  };
}

/**
 * Validates Anonymous SOS broadcasts to prevent bot spam, fake beacons, and floods:
 * 1. Checks honeypot (bots fill hidden form fields)
 * 2. Applies IP/device rate-limiting cooldown (45s per device)
 * 3. Enforces telecom-grade phone validation
 * 4. Checks GPS plausibility (non-zero, valid range)
 */
export function validateSosSecurityPayload({
  contactPhone,
  latitude,
  longitude,
  clientIp = "unknown",
  deviceFingerprint = "default",
  honeypot = null,
}) {
  // 1. Honeypot check: If automated bot filled this hidden field, reject immediately
  if (honeypot && String(honeypot).trim() !== "") {
    console.warn(`🚨 Bot detected via honeypot from IP: ${clientIp}`);
    return {
      isAllowed: false,
      error: "Automated submission rejected by Security Shield.",
      shieldStatus: "BOT_TRAP_TRIGGERED",
    };
  }

  // 2. Phone validation
  const phoneValidation = validatePhoneNumber(contactPhone);
  if (!phoneValidation.isValid) {
    return {
      isAllowed: false,
      error: phoneValidation.error,
      shieldStatus: "INVALID_PHONE_DATA",
    };
  }

  // 3. Emergency Rate-Limiter (anti-flood per IP / device token)
  const rateLimitKey = `${clientIp}_${deviceFingerprint}`;
  const now = Date.now();
  const lastBroadcastTime = sosRateLimitMap.get(rateLimitKey);

  if (lastBroadcastTime && now - lastBroadcastTime < RATE_LIMIT_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((RATE_LIMIT_COOLDOWN_MS - (now - lastBroadcastTime)) / 1000);
    return {
      isAllowed: false,
      error: `An active SOS beacon is already broadcasting from your device. Emergency units have already been notified. Cooldown: ${remainingSeconds}s.`,
      shieldStatus: "RATE_LIMITED",
      remainingSeconds,
    };
  }

  // 4. GPS Plausibility check (if coordinates provided)
  if (latitude !== undefined && latitude !== null) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return {
        isAllowed: false,
        error: "Invalid GPS coordinates telemetry detected.",
        shieldStatus: "INVALID_GPS",
      };
    }

    // Check Null Island (0,0) which indicates fake mock location
    if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
      console.warn("Notice: SOS triggered at Null Island (0,0), flagged for review.");
    }
  }

  // Record this valid broadcast for rate limiting
  sosRateLimitMap.set(rateLimitKey, now);

  // Clean up old entries in rate limiter every 100 entries
  if (sosRateLimitMap.size > 200) {
    const cutoff = now - RATE_LIMIT_COOLDOWN_MS;
    for (const [key, timestamp] of sosRateLimitMap.entries()) {
      if (timestamp < cutoff) sosRateLimitMap.delete(key);
    }
  }

  return {
    isAllowed: true,
    error: null,
    cleanPhone: phoneValidation.cleanPhone,
    shieldStatus: "SHIELD_VERIFIED",
  };
}
