import rateLimit from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const createSearchRateLimiter = () =>
  rateLimit({
    windowMs: WINDOW_MS,
    max: 100,
    message: { error: "Too many search requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

export const createValidateRateLimiter = () =>
  rateLimit({
    windowMs: WINDOW_MS,
    max: 60,
    message: { error: "Too many validation requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });
