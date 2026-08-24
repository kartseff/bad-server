import { API_URL, CDN_URL } from '@constants'

import {
    ICustomerPaginationResult,
    ICustomerResult,
    IFile,
    IOrder,
    IOrderPaginationResult,
    IOrderResult,
    IProduct,
    IProductPaginationResult,
    ServerResponse,
    StatusType,
    UserLoginBodyDto,
    UserRegisterBodyDto,
    UserResponse,
    UserResponseToken,
} from '@types'

export const enum RequestStatus {
    Idle = 'idle',
    Loading = 'loading',
    Success = 'success',
    Failed = 'failed',
}

export type ApiListResponse<Type> = {
    total: number
    items: Type[]
}

const createQueryString = (filters: Record<string, unknown>) => {
    const entries = Object.entries(filters).flatMap(([key, value]) =>
        value === '' || value === null || value === undefined
            ? []
            : [[key, String(value)] as [string, string]]
    )
    return new URLSearchParams(entries).toString()
}

class Api {
    private readonly baseUrl: string
    protected options: RequestInit
    private accessToken: string | null = null
    private csrfToken: string | null = null
    private csrfRequest: Promise<string> | null = null
    private refreshRequest: Promise<UserResponseToken> | null = null

    constructor(baseUrl: string, options: RequestInit = {}) {
        this.baseUrl = baseUrl
        document.cookie = 'accessToken=; Max-Age=0; Path=/; SameSite=Lax'
        this.options = {
            headers: {
                ...((options.headers as object) ?? {}),
            },
        }
    }

    setAccessToken = (token: string | null) => {
        this.accessToken = token
    }

    private getCsrfToken = async (): Promise<string> => {
        if (this.csrfToken) {
            return this.csrfToken
        }
        if (this.csrfRequest) {
            return this.csrfRequest
        }

        const request = fetch(`${this.baseUrl}/csrf-token`, {
            credentials: 'include',
        })
            .then((response) =>
                this.handleResponse<{ csrfToken: string }>(response)
            )
            .then(({ csrfToken }) => {
                this.csrfToken = csrfToken
                return csrfToken
            })
            .finally(() => {
                this.csrfRequest = null
            })
        this.csrfRequest = request
        return request
    }

    protected async handleResponse<T>(response: Response): Promise<T> {
        let data: unknown
        try {
            data = await response.json()
        } catch (_error) {
            data = { message: 'Сервер вернул некорректный ответ' }
        }

        if (response.ok) {
            return data as T
        }
        return Promise.reject({
            ...(data as Record<string, unknown>),
            statusCode: response.status,
        })
    }

    protected async request<T>(
        endpoint: string,
        options: RequestInit,
        retryCsrf = true
    ): Promise<T> {
        const method = (options.method || 'GET').toUpperCase()
        const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
        const headers = new Headers(this.options.headers)
        new Headers(options.headers).forEach((value, key) => {
            headers.set(key, value)
        })

        if (this.accessToken) {
            headers.set('Authorization', `Bearer ${this.accessToken}`)
        }
        if (mutating) {
            headers.set('X-CSRF-Token', await this.getCsrfToken())
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...this.options,
            ...options,
            credentials: 'include',
            headers,
        })

        if (response.status === 403 && mutating && retryCsrf) {
            this.csrfToken = null
            await this.getCsrfToken()
            return this.request<T>(endpoint, options, false)
        }

        return this.handleResponse<T>(response)
    }

    private refreshToken = () => {
        if (this.refreshRequest) {
            return this.refreshRequest
        }

        const request = this.request<UserResponseToken>('/auth/token', {
            method: 'POST',
        }).finally(() => {
            this.refreshRequest = null
        })
        this.refreshRequest = request
        return request
    }

    protected requestWithRefresh = async <T>(
        endpoint: string,
        options: RequestInit
    ) => {
        try {
            return await this.request<T>(endpoint, options)
        } catch (error: unknown) {
            if (
                !error ||
                typeof error !== 'object' ||
                !('statusCode' in error) ||
                error.statusCode !== 401
            ) {
                return Promise.reject(error)
            }
            const refreshData = await this.refreshToken()
            if (!refreshData.success) {
                return Promise.reject(refreshData)
            }
            this.setAccessToken(refreshData.accessToken)
            return this.request<T>(endpoint, options)
        }
    }
}

export interface IWebLarekAPI {
    getProductList: (
        filters: Record<string, unknown>
    ) => Promise<IProductPaginationResult>
    getProductItem: (id: string) => Promise<IProduct>
    createOrder: (order: IOrder) => Promise<IOrderResult>
}

export class WebLarekAPI extends Api implements IWebLarekAPI {
    readonly cdn: string

    constructor(cdn: string, baseUrl: string, options?: RequestInit) {
        super(baseUrl, options)
        this.cdn = cdn
    }

    getProductItem = (id: string): Promise<IProduct> => {
        return this.request<IProduct>(`/product/${id}`, { method: 'GET' }).then(
            (data: IProduct) => ({
                ...data,
                image: {
                    ...data.image,
                    fileName: this.cdn + data.image.fileName,
                },
            })
        )
    }

    getProductList = (
        filters: Record<string, unknown> = {}
    ): Promise<IProductPaginationResult> => {
        const queryParams = createQueryString(filters)
        return this.request<IProductPaginationResult>(
            `/product?${queryParams}`,
            {
                method: 'GET',
            }
        ).then((data) => ({
            ...data,
            items: data.items.map((item) => ({
                ...item,
                image: {
                    ...item.image,
                    fileName: this.cdn + item.image.fileName,
                },
            })),
        }))
    }

    createOrder = (order: IOrder): Promise<IOrderResult> => {
        return this.requestWithRefresh<IOrderResult>('/order', {
            method: 'POST',
            body: JSON.stringify(order),
            headers: {
                'Content-Type': 'application/json',
            },
        }).then((data: IOrderResult) => data)
    }

    updateOrderStatus = (
        status: StatusType,
        orderNumber: string
    ): Promise<IOrderResult> => {
        return this.requestWithRefresh<IOrderResult>(`/order/${orderNumber}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
            headers: {
                'Content-Type': 'application/json',
            },
        })
    }

    getAllOrders = (
        filters: Record<string, unknown> = {}
    ): Promise<IOrderPaginationResult> => {
        const queryParams = createQueryString(filters)
        return this.requestWithRefresh<IOrderPaginationResult>(
            `/order/all?${queryParams}`,
            {
                method: 'GET',
            }
        )
    }

    getCurrentUserOrders = (
        filters: Record<string, unknown> = {}
    ): Promise<IOrderPaginationResult> => {
        const queryParams = createQueryString(filters)
        return this.requestWithRefresh<IOrderPaginationResult>(
            `/order/all/me?${queryParams}`,
            {
                method: 'GET',
            }
        )
    }

    getOrderByNumber = (orderNumber: string): Promise<IOrderResult> => {
        return this.requestWithRefresh<IOrderResult>(`/order/${orderNumber}`, {
            method: 'GET',
        })
    }

    getOrderCurrentUserByNumber = (
        orderNumber: string
    ): Promise<IOrderResult> => {
        return this.requestWithRefresh<IOrderResult>(
            `/order/me/${orderNumber}`,
            {
                method: 'GET',
            }
        )
    }

    loginUser = (data: UserLoginBodyDto) => {
        return this.request<UserResponseToken>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        }).then((response) => {
            this.setAccessToken(response.accessToken)
            return response
        })
    }

    registerUser = (data: UserRegisterBodyDto) => {
        return this.request<UserResponseToken>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        }).then((response) => {
            this.setAccessToken(response.accessToken)
            return response
        })
    }

    getUser = () => {
        return this.requestWithRefresh<UserResponse>('/auth/user', {
            method: 'GET',
        })
    }

    getUserRoles = () => {
        return this.requestWithRefresh<string[]>('/auth/user/roles', {
            method: 'GET',
        })
    }

    getAllCustomers = (
        filters: Record<string, unknown> = {}
    ): Promise<ICustomerPaginationResult> => {
        const queryParams = createQueryString(filters)
        return this.requestWithRefresh<ICustomerPaginationResult>(
            `/customers?${queryParams}`,
            {
                method: 'GET',
            }
        )
    }

    getCustomerById = (idCustomer: string) => {
        return this.requestWithRefresh<ICustomerResult>(
            `/customers/${idCustomer}`,
            {
                method: 'GET',
            }
        )
    }

    logoutUser = () => {
        return this.request<ServerResponse<unknown>>('/auth/logout', {
            method: 'POST',
        }).finally(() => this.setAccessToken(null))
    }

    createProduct = (data: Omit<IProduct, '_id'>) => {
        return this.requestWithRefresh<IProduct>('/product', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        }).then((data: IProduct) => ({
            ...data,
            image: {
                ...data.image,
                fileName: this.cdn + data.image.fileName,
            },
        }))
    }

    uploadFile = (data: FormData) => {
        return this.requestWithRefresh<IFile>('/upload', {
            method: 'POST',
            body: data,
        }).then((data) => ({
            ...data,
            fileName: data.fileName,
        }))
    }

    updateProduct = (data: Partial<Omit<IProduct, '_id'>>, id: string) => {
        return this.requestWithRefresh<IProduct>(`/product/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
            },
        }).then((data: IProduct) => ({
            ...data,
            image: {
                ...data.image,
                fileName: this.cdn + data.image.fileName,
            },
        }))
    }

    deleteProduct = (id: string) => {
        return this.requestWithRefresh<IProduct>(`/product/${id}`, {
            method: 'DELETE',
        })
    }
}

export default new WebLarekAPI(CDN_URL, API_URL)
