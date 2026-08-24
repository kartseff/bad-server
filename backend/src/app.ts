import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS, ORIGIN_ALLOW, PORT, TRUST_PROXY } from './config'
import { csrfProtection } from './middlewares/csrf'
import errorHandler from './middlewares/error-handler'
import { globalLimiter } from './middlewares/rate-limiter'
import safeInput from './middlewares/safe-input'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'
import cleanupTempUploads from './utils/cleanupTempUploads'

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', TRUST_PROXY)
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
)
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || ORIGIN_ALLOW.includes(origin)) {
                return callback(null, true)
            }
            return callback(null, false)
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Authorization',
            'Content-Type',
            'X-CSRF-Token',
            'CSRF-Token',
        ],
    })
)
app.use(globalLimiter)

app.use(cookieParser())

app.use(serveStatic(path.join(__dirname, 'public')))

app.use(urlencoded({ extended: false, limit: '100kb', parameterLimit: 100 }))
app.use(json({ limit: '100kb' }))
app.use(safeInput)
app.use(csrfProtection)

app.use(routes)
app.use(errors())
app.use(errorHandler)

const bootstrap = async () => {
    try {
        mongoose.set('sanitizeFilter', true)
        mongoose.set('strictQuery', true)
        await mongoose.connect(DB_ADDRESS, {
            maxPoolSize: 20,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5_000,
        })
        await cleanupTempUploads()
        const cleanupTimer = setInterval(() => {
            cleanupTempUploads().catch((error) => console.error(error))
        }, 60 * 60 * 1000)
        cleanupTimer.unref()
        const server = app.listen(PORT, () => console.log('ok'))
        server.requestTimeout = 30_000
        server.headersTimeout = 35_000
        server.keepAliveTimeout = 5_000
    } catch (error) {
        console.error(error)
        process.exitCode = 1
    }
}

bootstrap()

export default app
