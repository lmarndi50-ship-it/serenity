import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { asyncHandler } from '../utils/response';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from '../validation/schemas';
import * as auth from '../controllers/auth.controller';

const router = Router();

// Credential endpoints get a tighter limit than the rest of the API.
const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(auth.login));
router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(auth.register),
);
router.post('/refresh', validate({ body: refreshSchema }), asyncHandler(auth.refresh));
router.post('/logout', asyncHandler(auth.logout));
router.get('/me', authenticate, asyncHandler(auth.me));
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(auth.changePassword),
);

export default router;
