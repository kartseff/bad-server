import { Router } from 'express'
import {
    createProduct,
    deleteProduct,
    getProductById,
    getProducts,
    updateProduct,
} from '../controllers/products'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import {
    validateObjId,
    validateProductBody,
    validateProductUpdateBody,
    validateProductsQuery,
} from '../middlewares/validations'
import { Role } from '../models/user'

const productRouter = Router()

productRouter.get('/', validateProductsQuery, getProducts)
productRouter.get('/:productId', validateObjId, getProductById)
productRouter.post(
    '/',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateProductBody,
    createProduct
)
productRouter.delete(
    '/:productId',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateObjId,
    deleteProduct
)
productRouter.patch(
    '/:productId',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateObjId,
    validateProductUpdateBody,
    updateProduct
)

export default productRouter
