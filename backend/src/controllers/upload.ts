import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import { unlink } from 'fs/promises'
import sharp from 'sharp'
import { UPLOAD_PATH } from '../config'
import BadRequestError from '../errors/bad-request-error'

const ALLOWED_FORMATS = new Set(['png', 'jpeg', 'gif', 'webp'])
const MIME_FORMATS: Record<string, string> = {
    'image/png': 'png',
    'image/jpg': 'jpeg',
    'image/jpeg': 'jpeg',
    'image/gif': 'gif',
    'image/webp': 'webp',
}

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
  if (!req.file) {
    return next(new BadRequestError('Файл не загружен'))
  }

  if (req.file.size <= 2 * 1024) {
    await unlink(req.file.path).catch(() => undefined)
    return next(new BadRequestError('Размер файла должен превышать 2 КБ'))
  }

  try {
        const metadata = await sharp(req.file.path, {
            limitInputPixels: 40_000_000,
        }).metadata()
        if (
            !metadata.format ||
            !ALLOWED_FORMATS.has(metadata.format) ||
            metadata.format !== MIME_FORMATS[req.file.mimetype] ||
            !metadata.width ||
            !metadata.height ||
            metadata.width > 10_000 ||
            metadata.height > 10_000
        ) {
            await unlink(req.file.path)
            return next(new BadRequestError('Содержимое файла не является изображением'))
        }

        const fileName = `/${UPLOAD_PATH}/${req.file.filename}`
        return res.status(constants.HTTP_STATUS_CREATED).send({
            fileName,
            originalName: req.file.originalname.slice(0, 255),
        })
    } catch (error) {
        await unlink(req.file.path).catch(() => undefined)
        if (error instanceof Error) {
            return next(new BadRequestError('Некорректное изображение'))
        }
        return next(error)
    }
}

export default {}
