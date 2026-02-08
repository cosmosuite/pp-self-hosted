/**
 * Rate-limiting middleware using express-rate-limit.
 */

import rateLimit from "express-rate-limit";

// General API rate limit: 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    error: "Too many requests",
    detail: "Rate limit exceeded. Try again later.",
  },
});

// Detection endpoint: 30 requests per minute per IP
export const detectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    error: "Too many detection requests",
    detail: "Max 30 detections per minute. Try again later.",
  },
});
