import { Router } from 'express'
import { uploadFile } from '../controllers/upload'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import fileMiddleware from '../middlewares/file'
import { uploadLimiter } from '../middlewares/rate-limiter'
import { Role } from '../models/user'

const uploadRouter = Router()
uploadRouter.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})
uploadRouter.post(
    '/',
    auth,
    roleGuardMiddleware(Role.Admin),
    uploadLimiter,
    fileMiddleware.single('file'),
    uploadFile
)

export default uploadRouter
