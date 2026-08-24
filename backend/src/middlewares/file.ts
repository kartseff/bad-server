import { Request, Express } from 'express'
import multer, { FileFilterCallback } from 'multer'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import { UPLOAD_PATH_TEMP } from '../config'
import BadRequestError from '../errors/bad-request-error'

type DestinationCallback = (error: Error | null, destination: string) => void
type FileNameCallback = (error: Error | null, filename: string) => void

const storage = multer.diskStorage({
    destination: (
        _req: Request,
        _file: Express.Multer.File,
        cb: DestinationCallback
    ) => {
        const destinationPath = join(
            __dirname,
            `../public/${UPLOAD_PATH_TEMP}`
        )

        mkdirSync(destinationPath, { recursive: true })

        cb(null, destinationPath)
    },

    filename: (
        _req: Request,
        file: Express.Multer.File,
        cb: FileNameCallback
    ) => {
        const extensions: Record<string, string> = {
            'image/png': 'png',
            'image/jpg': 'jpg',
            'image/jpeg': 'jpg',
            'image/gif': 'gif',
            'image/webp': 'webp',
        }
        const extension = extensions[file.mimetype]
        const name = `${Date.now()}-${randomBytes(12).toString('hex')}.${extension}`
        cb(null, name)
    },
})

const types = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/webp',
]

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    if (!types.includes(file.mimetype)) {
        return cb(new BadRequestError('Неподдерживаемый формат изображения'))
    }

    return cb(null, true)
}

export default multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
        fields: 5,
        fieldSize: 16 * 1024,
        parts: 6,
        headerPairs: 50,
    },
})
