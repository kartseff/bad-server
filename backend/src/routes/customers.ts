import { Router } from 'express'
import {
    deleteCustomer,
    getCustomerById,
    getCustomers,
    updateCustomer,
} from '../controllers/customers'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import {
    validateCustomersQuery,
    validateCustomerUpdate,
    validateId,
} from '../middlewares/validations'
import { Role } from '../models/user'

const customerRouter = Router()

customerRouter.use(auth, roleGuardMiddleware(Role.Admin))
customerRouter.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
})
customerRouter.get('/', validateCustomersQuery, getCustomers)
customerRouter.get('/:id', validateId, getCustomerById)
customerRouter.patch('/:id', validateId, validateCustomerUpdate, updateCustomer)
customerRouter.delete('/:id', validateId, deleteCustomer)

export default customerRouter
