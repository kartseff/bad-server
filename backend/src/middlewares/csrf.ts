import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { CSRF_SECRET, IS_PRODUCTION, ORIGIN_ALLOW } from '../config'
import ForbiddenError from '../errors/forbidden-error'

const CSRF_COOKIE = '_csrf'
const CSRF_HEADER = 'x-csrf-token'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const SECRET_PATTERN = /^[a-f0-9]{64}$/

const createToken = (secret: string) =>
    crypto.createHmac('sha256', CSRF_SECRET).update(secret).digest('hex')

const tokensMatch = (received: string, expected: string) => {
    const receivedBuffer = Buffer.from(received, 'utf8')
    const expectedBuffer = Buffer.from(expected, 'utf8')
    return (
        receivedBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    )
}

export const getCsrfToken = (req: Request, res: Response) => {
    const cookieSecret = req.cookies[CSRF_COOKIE]
    const secret = SECRET_PATTERN.test(cookieSecret || '')
        ? cookieSecret
        : crypto.randomBytes(32).toString('hex')

    if (secret !== cookieSecret) {
        res.cookie(CSRF_COOKIE, secret, {
            httpOnly: true,
            sameSite: 'strict',
            secure: IS_PRODUCTION,
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
        })
    }

    res.set('Cache-Control', 'no-store')
    return res.status(200).json({ csrfToken: createToken(secret) })
}

export const csrfProtection = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    if (SAFE_METHODS.has(req.method)) {
        return next()
    }

    const origin = req.get('origin')
    if (origin && !ORIGIN_ALLOW.includes(origin)) {
        return next(new ForbiddenError('Недопустимый источник запроса'))
    }

    const secret = req.cookies[CSRF_COOKIE]
    const token = req.get(CSRF_HEADER) || req.get('csrf-token')
    if (
        !SECRET_PATTERN.test(secret || '') ||
        !token ||
        !tokensMatch(token, createToken(secret))
    ) {
        return next(new ForbiddenError('Невалидный CSRF-токен'))
    }

    return next()
}
