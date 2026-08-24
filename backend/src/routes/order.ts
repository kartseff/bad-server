import { Router } from 'express'
import {
    createOrder,
    deleteOrder,
    getOrderByNumber,
    getOrderCurrentUserByNumber,
    getOrders,
    getOrdersCurrentUser,
    updateOrder,
} from '../controllers/order'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import {
    validateId,
    validateOrderBody,
    validateOrderNumber,
    validateOrdersCurrentUserQuery,
    validateOrdersQuery,
    validateOrderUpdate,
} from '../middlewares/validations'
import { Role } from '../models/user'

const orderRouter = Router()

orderRouter.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})
orderRouter.post('/', auth, validateOrderBody, createOrder)
orderRouter.get(
    '/all',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateOrdersQuery,
    getOrders
)
orderRouter.get(
    '/all/me',
    auth,
    validateOrdersCurrentUserQuery,
    getOrdersCurrentUser
)
orderRouter.get(
    '/:orderNumber',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateOrderNumber,
    getOrderByNumber
)
orderRouter.get(
    '/me/:orderNumber',
    auth,
    validateOrderNumber,
    getOrderCurrentUserByNumber
)
orderRouter.patch(
    '/:orderNumber',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateOrderNumber,
    validateOrderUpdate,
    updateOrder
)

orderRouter.delete(
    '/:id',
    auth,
    roleGuardMiddleware(Role.Admin),
    validateId,
    deleteOrder
)

export default orderRouter
