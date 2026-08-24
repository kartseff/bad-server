import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import { Error as MongooseError } from 'mongoose'
import { join } from 'path'
import { UPLOAD_PATH, UPLOAD_PATH_TEMP } from '../config'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import NotFoundError from '../errors/not-found-error'
import Product from '../models/product'
import movingFile from '../utils/movingFile'

// GET /product
const getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page = 1, limit = 5 } = req.query
        const options = {
            skip: (Number(page) - 1) * Number(limit),
            limit: Number(limit),
        }
        const products = await Product.find({}, null, options)
        const totalProducts = await Product.countDocuments({})
        const totalPages = Math.ceil(totalProducts / Number(limit))
        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
        return res.send({
            items: products,
            pagination: {
                totalProducts,
                totalPages,
                currentPage: Number(page),
                pageSize: Number(limit),
            },
        })
    } catch (err) {
        return next(err)
    }
}

// GET /product/:productId
const getProductById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const product = await Product.findById(req.params.productId).orFail(
            () => new NotFoundError('Нет товара по заданному id')
        )
        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
        return res.status(200).send(product)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        return next(error)
    }
}

// POST /product
const createProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { description, category, price, title, image } = req.body

        // Переносим картинку из временной папки
        if (image) {
            await movingFile(
                image.fileName,
                join(__dirname, `../public/${UPLOAD_PATH_TEMP}`),
                join(__dirname, `../public/${UPLOAD_PATH}`)
            )
        }

        const product = await Product.create({
            description,
            image,
            category,
            price,
            title,
        })
        return res.status(constants.HTTP_STATUS_CREATED).send(product)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }
        return next(error)
    }
}

// PUT /product
const updateProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        const { image } = req.body

        // Переносим картинку из временной папки
        if (image) {
            await movingFile(
                image.fileName,
                join(__dirname, `../public/${UPLOAD_PATH_TEMP}`),
                join(__dirname, `../public/${UPLOAD_PATH}`)
            )
        }

        const product = await Product.findByIdAndUpdate(
            productId,
            {
                $set: {
                    ...req.body,
                    price: req.body.price ?? null,
                    image: req.body.image ? req.body.image : undefined,
                },
            },
            { runValidators: true, new: true }
        ).orFail(() => new NotFoundError('Нет товара по заданному id'))
        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Товар с таким заголовком уже существует')
            )
        }
        return next(error)
    }
}

// DELETE /product
const deleteProduct = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { productId } = req.params
        const product = await Product.findByIdAndDelete(productId).orFail(
            () => new NotFoundError('Нет товара по заданному id')
        )
        return res.send(product)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID товара'))
        }
        return next(error)
    }
}

export {
    createProduct,
    deleteProduct,
    getProductById,
    getProducts,
    updateProduct,
}
