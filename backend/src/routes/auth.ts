import { Router } from 'express'
import {
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
} from '../controllers/auth'
import auth from '../middlewares/auth'
import { getCsrfToken } from '../middlewares/csrf'
import { authLimiter } from '../middlewares/rate-limiter'
import {
    validateAuthentication,
    validateCurrentUserUpdate,
    validateUserBody,
} from '../middlewares/validations'

const authRouter = Router()

authRouter.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})
authRouter.get('/csrf-token', getCsrfToken)
authRouter.get('/user', auth, getCurrentUser)
authRouter.patch('/me', auth, validateCurrentUserUpdate, updateCurrentUser)
authRouter.get('/user/roles', auth, getCurrentUserRoles)
authRouter.post('/login', authLimiter, validateAuthentication, login)
authRouter.post('/token', refreshAccessToken)
authRouter.post('/logout', logout)
authRouter.post('/register', authLimiter, validateUserBody, register)

export default authRouter
