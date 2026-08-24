import { rateLimit } from 'express-rate-limit'

const tooManyRequests = {
    message: 'Слишком много запросов. Повторите попытку позже',
}

export const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooManyRequests,
})

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooManyRequests,
})

export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooManyRequests,
})
