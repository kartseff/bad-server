import { Joi, celebrate } from 'celebrate'
import { Types } from 'mongoose'

export const phoneRegExp = /^\+?[0-9 ()-]{7,20}$/

export enum PaymentType {
    Card = 'card',
    Online = 'online',
}

const objectId = Joi.string()
    .required()
    .custom((value, helpers) =>
        Types.ObjectId.isValid(value)
            ? value
            : helpers.message({ custom: 'Невалидный id' })
    )

const password = Joi.string()
    .min(8)
    .max(72)
    .required()
    .custom((value, helpers) =>
        Buffer.byteLength(value, 'utf8') <= 72
            ? value
            : helpers.message({ custom: 'Пароль не должен превышать 72 байта' })
    )

const email = Joi.string().trim().lowercase().email().max(254).required()
const name = Joi.string().trim().min(2).max(30)
const phone = Joi.string().trim().pattern(phoneRegExp).max(20)
const search = Joi.string().trim().allow('').max(100)
const page = Joi.number().integer().min(1).default(1)
const limit = Joi.number()
  .integer()
  .min(1)
  .custom((value) => Math.min(value, 10))

const image = Joi.object({
    fileName: Joi.string()
        .pattern(/^\/images\/[A-Za-z0-9_-]+\.(?:png|jpe?g|gif|webp)$/i)
        .max(200)
        .required(),
    originalName: Joi.string().trim().max(255).required(),
}).unknown(false)

export const validateOrderBody = celebrate({
    body: Joi.object({
        items: Joi.array().items(objectId).min(1).max(100).unique().required(),
        payment: Joi.string()
            .valid(...Object.values(PaymentType))
            .required(),
        email,
        phone: phone.required(),
        address: Joi.string().trim().min(5).max(300).required(),
        total: Joi.number().min(0).max(10_000_000).required(),
        comment: Joi.string().trim().allow('').max(2000).default(''),
    }).unknown(false),
})

export const validateProductBody = celebrate({
    body: Joi.object({
        title: Joi.string().trim().min(2).max(30).required(),
        image: image.required(),
        category: Joi.string().trim().min(1).max(50).required(),
        description: Joi.string().trim().max(5000).required(),
        price: Joi.number().min(0).max(10_000_000).allow(null).required(),
    }).unknown(false),
})

export const validateProductUpdateBody = celebrate({
    body: Joi.object({
        title: Joi.string().trim().min(2).max(30),
        image,
        category: Joi.string().trim().min(1).max(50),
        description: Joi.string().trim().max(5000),
        price: Joi.number().min(0).max(10_000_000).allow(null),
    })
        .min(1)
        .unknown(false),
})

export const validateProductsQuery = celebrate({
    query: Joi.object({
        page,
        limit: limit.default(5),
    }).unknown(false),
})

export const validateOrdersQuery = celebrate({
    query: Joi.object({
        page,
        limit: limit.default(10),
        sortField: Joi.string()
            .valid('createdAt', 'orderNumber', 'totalAmount', 'status')
            .default('createdAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
        status: Joi.string().valid('new', 'delivering', 'completed', 'cancelled'),
        totalAmountFrom: Joi.number().min(0).max(10_000_000),
        totalAmountTo: Joi.number().min(0).max(10_000_000),
        orderDateFrom: Joi.date().iso(),
        orderDateTo: Joi.date().iso(),
        search,
    }).unknown(false),
})

export const validateOrdersCurrentUserQuery = celebrate({
    query: Joi.object({
        page,
        limit: limit.default(5),
        search,
    }).unknown(false),
})

export const validateCustomersQuery = celebrate({
    query: Joi.object({
        page,
        limit: limit.default(10),
        sortField: Joi.string()
            .valid('createdAt', 'name', 'totalAmount', 'orderCount')
            .default('createdAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
        registrationDateFrom: Joi.date().iso(),
        registrationDateTo: Joi.date().iso(),
        lastOrderDateFrom: Joi.date().iso(),
        lastOrderDateTo: Joi.date().iso(),
        totalAmountFrom: Joi.number().min(0).max(10_000_000),
        totalAmountTo: Joi.number().min(0).max(10_000_000),
        orderCountFrom: Joi.number().integer().min(0).max(100_000),
        orderCountTo: Joi.number().integer().min(0).max(100_000),
        search,
    }).unknown(false),
})

export const validateObjId = celebrate({
    params: Joi.object({ productId: objectId }).unknown(false),
})

export const validateId = celebrate({
    params: Joi.object({ id: objectId }).unknown(false),
})

export const validateOrderNumber = celebrate({
    params: Joi.object({
        orderNumber: Joi.number().integer().min(1).required(),
    }).unknown(false),
})

export const validateUserBody = celebrate({
    body: Joi.object({
        name: name.required(),
        password,
        email,
    }).unknown(false),
})

export const validateAuthentication = celebrate({
    body: Joi.object({ email, password }).unknown(false),
})

export const validateCurrentUserUpdate = celebrate({
    body: Joi.object({
        name,
        email: Joi.string().trim().lowercase().email().max(254),
        phone: phone.allow(''),
    })
        .min(1)
        .unknown(false),
})

export const validateCustomerUpdate = validateCurrentUserUpdate

export const validateOrderUpdate = celebrate({
    body: Joi.object({
        status: Joi.string()
            .valid('new', 'delivering', 'completed', 'cancelled')
            .required(),
    }).unknown(false),
})
