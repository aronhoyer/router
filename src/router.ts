import { IncomingMessage, STATUS_CODES, ServerResponse } from "node:http"

type RouteParam = {
    key: string
    position: number
}

export type Request = IncomingMessage & {
    params: Map<string, string>
    query: URLSearchParams
}

export type Response = ServerResponse<Request>

export type Handler = (req: Request, res: Response) => void | Promise<void>

class Route {
    path: string
    params: RouteParam[]
    handlers: Record<string, Handler>

    constructor(path: string) {
        this.path = path
        this.params = Route.getParams(path)
        this.handlers = {}
    }

    private static getParams(path: string): RouteParam[] {
        const parts = path.split("/").filter(Boolean)
        const params: RouteParam[] = []

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            if (part.startsWith(":")) {
                params.push({ key: part.slice(1), position: i })
            }
        }

        return params
    }

    addHandler(method: string, handler: Handler): Route {
        this.handlers[method] = handler
        return this
    }

    getParamValues(url: string) {
        const parts = url.split("/").filter(Boolean)
        const params: Map<string, string> = new Map()

        for (let i = 0; i < this.params.length; i++) {
            const param = this.params[i]
            params.set(param.key, parts[param.position])
        }

        return params
    }
}

export class Router {
    private routes: Record<string, Route>

    constructor() {
        this.routes = {}
        this.requestListener = this.requestListener.bind(this)
    }

    private addRoute(method: string, path: string, handler: Handler) {
        if (this.routes[path]) {
            this.routes[path].addHandler(method, handler)
        } else {
            this.routes[path] = new Route(path).addHandler(method, handler)
        }
    }

    private pathMatches(url: string, path: string) {
        const urlParts = url.split("/").filter(Boolean)
        const pathParts = path.split("/").filter(Boolean)

        if (urlParts.length !== pathParts.length) {
            return false
        }

        const matchingParts: boolean[] = []
        for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i].startsWith(":")) {
                matchingParts.push(true)
            } else {
                matchingParts.push(pathParts[i].toLowerCase() === urlParts[i].toLowerCase())
            }
        }

        return matchingParts.every(Boolean)
    }

    notFoundHandler(req: Request, res: Response) {
        res.setHeader("content-type", "application/json")
        res.statusCode = 404
        res.end(STATUS_CODES[res.statusCode])
    }

    methodNotAllowedHandler(req: Request, res: Response) {
        res.setHeader("content-type", "application/json")
        res.statusCode = 405
        res.end(STATUS_CODES[res.statusCode])
    }

    DELETE(path: string, handler: Handler) {
        this.addRoute("DELETE", path, handler)
    }

    GET(path: string, handler: Handler) {
        this.addRoute("GET", path, handler)
    }

    PATCH(path: string, handler: Handler) {
        this.addRoute("PATCH", path, handler)
    }

    POST(path: string, handler: Handler) {
        this.addRoute("POST", path, handler)
    }

    PUT(path: string, handler: Handler) {
        this.addRoute("PUT", path, handler)
    }

    requestListener(req: IncomingMessage, res: ServerResponse) {
        const [url, querystring] = req.url?.split("?") || "/"
        const method = req.method || "GET"

        let handler: Handler = this.notFoundHandler

        let params: Map<string, string> = new Map()
        let query: URLSearchParams = new URLSearchParams()

        for (const path in this.routes) {
            if (this.pathMatches(url, path)) {
                if (method in this.routes[path].handlers) {
                    params = this.routes[path].getParamValues(url)
                    query = new URLSearchParams(querystring)
                    handler = this.routes[path].handlers[method]
                } else {
                    handler = this.methodNotAllowedHandler
                }

                break
            }
        }

        const request = Object.assign(req, { params, query }) as Request
        const response = res as Response

        handler.call(this, request, response)
    }
}
