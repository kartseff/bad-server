import { NextFunction, Request, Response } from 'express'
import BadRequestError from '../errors/bad-request-error'

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const containsUnsafeKey = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') {
        return false
    }

    return Object.entries(value).some(([key, nestedValue]) => {
        if (
            key.startsWith('$') ||
            key.includes('.') ||
            FORBIDDEN_KEYS.has(key)
        ) {
            return true
        }
        return containsUnsafeKey(nestedValue)
    })
}

const safeInput = (req: Request, _res: Response, next: NextFunction) => {
    if (
        containsUnsafeKey(req.body) ||
        containsUnsafeKey(req.query) ||
        containsUnsafeKey(req.params)
    ) {
        return next(new BadRequestError('Недопустимая структура запроса'))
    }
    return next()
}

export default safeInput
