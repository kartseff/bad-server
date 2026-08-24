import { ErrorRequestHandler } from 'express'
import multer from 'multer'

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const multerStatus =
        err instanceof multer.MulterError
            ? err.code === 'LIMIT_FILE_SIZE'
                ? 413
                : 400
            : undefined
    const statusCode = multerStatus || err.statusCode || err.status || 500
    const invalidJson = err instanceof SyntaxError && 'body' in err
    let message = err.message
    if (statusCode === 500) {
        message = 'На сервере произошла ошибка'
    } else if (invalidJson) {
        message = 'Некорректный JSON'
    } else if (statusCode === 413) {
        message = 'Превышен допустимый размер запроса'
    }
    if (statusCode === 500) {
        console.error(err)
    }

    res.status(statusCode).send({ message })
}

export default errorHandler
