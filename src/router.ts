import { IncomingMessage, STATUS_CODES, ServerResponse } from "node:http"
import { basename } from "node:path"

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
    basename: string
    params: RouteParam[]
    handlers: Record<string, Handler>
    children: Route[]
    parent?: Route

    constructor(path: string, method?: string, handler?: Handler, parent?: Route) {
        this.basename = basename(path)
        this.params = Route.#getParams(path)
        this.handlers = method && handler ? { [method]: handler } : {}
        this.children = []
        this.parent = parent
    }

    static #getParams(path: string): RouteParam[] {
        const parts = path.split("/")
        const params: RouteParam[] = []

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]
            if (part.startsWith(":")) {
                params.push({ key: part.slice(1), position: i })
            }
        }

        return params
    }

    getParamValues(url: string) {
        const parts = url.split("/")
        const params: Map<string, string> = new Map()

        for (let i = 0; i < this.params.length; i++) {
            const param = this.params[i]
            params.set(param.key, parts[param.position])
        }

        return params
    }
}

export class Router {
    private root: Route

    constructor() {
        this.root = new Route("/")
        this.requestListener = this.requestListener.bind(this)
    }

    #findRoute(path: string): Route {
        let route = this.root

        if (path !== "/") {
            const parts = path.split("/")

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i]

                for (let j = 0; j < route.children.length; j++) {
                    const child = route.children[j]

                    if (
                        part.toLowerCase() === child.basename.toLowerCase() ||
                        (child.basename.startsWith(":") &&
                            child.params.find((param) => param.position === i)) ||
                        (child.basename.startsWith("*") &&
                            child.params.find((param) => param.position === i))
                    ) {
                        route = child
                        break
                    }
                }
            }
        }

        return route
    }

    #addRoute(path: string, method: string, handler: Handler) {
        const route = this.#findRoute(path)

        if (basename(path.toLowerCase()) === route.basename.toLowerCase()) {
            route.handlers[method] = handler
        } else {
            route.children.push(new Route(path, method, handler, route))
        }
    }

    notFoundHandler(_: Request, res: Response) {
        res.setHeader("content-type", "application/json")
        res.statusCode = 404
        res.end(STATUS_CODES[res.statusCode])
    }

    methodNotAllowedHandler(_: Request, res: Response) {
        res.setHeader("content-type", "application/json")
        res.statusCode = 405
        res.end(STATUS_CODES[res.statusCode])
    }

    DELETE(path: string, handler: Handler) {
        this.#addRoute(path, "DELETE", handler)
    }

    GET(path: string, handler: Handler) {
        this.#addRoute(path, "GET", handler)
    }

    PATCH(path: string, handler: Handler) {
        this.#addRoute(path, "PATCH", handler)
    }

    POST(path: string, handler: Handler) {
        this.#addRoute(path, "POST", handler)
    }

    PUT(path: string, handler: Handler) {
        this.#addRoute(path, "PUT", handler)
    }

    requestListener(req: IncomingMessage, res: ServerResponse) {
        const [url, querystring] = req.url?.split("?") || "/"
        const method = req.method || "GET"

        const route = this.#findRoute(url)

        const request = req as Request
        const response = res as Response

        if (Object.keys(route.handlers).length === 0) {
            this.notFoundHandler(request, response)
        } else if (!route.handlers[method]) {
            this.methodNotAllowedHandler(request, response)
        } else {
            request.params = route.getParamValues(url)
            request.query = new URLSearchParams(querystring)
            route.handlers[method](request, response)
        }
    }
}
