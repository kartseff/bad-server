import { CookieOptions } from 'express'
import ms from 'ms'

export const { PORT = '3000' } = process.env
export const { DB_ADDRESS = 'mongodb://127.0.0.1:27017/weblarek' } = process.env
export const ORIGIN_ALLOW = (process.env.ORIGIN_ALLOW || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'
export const TRUST_PROXY = Number(process.env.TRUST_PROXY || 1)

const getDirectoryName = (name: string, fallback: string) => {
    const value = process.env[name] || fallback
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
        throw new Error(`${name} содержит недопустимое имя директории`)
    }
    return value
}

const getSecret = (name: string, developmentFallback: string) => {
    const secret = process.env[name]
    if (IS_PRODUCTION && (!secret || secret.length < 32)) {
        throw new Error(`${name} должен содержать не менее 32 символов`)
    }
    return secret || developmentFallback
}

export const ACCESS_TOKEN = {
    secret: getSecret('AUTH_ACCESS_TOKEN_SECRET', 'access-secret-dev-only'),
    expiry: process.env.AUTH_ACCESS_TOKEN_EXPIRY || '15m',
}
export const REFRESH_TOKEN = {
    secret: getSecret('AUTH_REFRESH_TOKEN_SECRET', 'refresh-secret-dev-only'),
    expiry: process.env.AUTH_REFRESH_TOKEN_EXPIRY || '7d',
    cookie: {
        name: 'refreshToken',
        options: {
            httpOnly: true,
            sameSite: 'strict',
            secure: IS_PRODUCTION,
            maxAge: ms(process.env.AUTH_REFRESH_TOKEN_EXPIRY || '7d'),
            path: '/',
        } as CookieOptions,
    },
}

export const CSRF_SECRET = getSecret('CSRF_SECRET', 'csrf-secret-dev-only')
export const UPLOAD_PATH = getDirectoryName('UPLOAD_PATH', 'images')
export const UPLOAD_PATH_TEMP = getDirectoryName('UPLOAD_PATH_TEMP', 'temp')
