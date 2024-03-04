import { IncomingMessage, STATUS_CODES, ServerResponse } from 'node:http';
import { basename, extname } from 'node:path';
import { Queue } from './queue';

type Request = IncomingMessage & {
    params: Map<string, string>;
    query: URLSearchParams;
    filename: string;
};

type Response = ServerResponse<Request>;

type Handler = (req: Request, res: Response) => void | Promise<void>;

class Route {
    // the path is a single segment of the provided path
    // for example, if the path is /api/v1/users, the first segment is api and the second is v1
    path: string;
    params: { key: string; position: number }[];

    // handler is called when the route is matched
    // if a route has a handler, it is a leaf node
    // if a route does not have a handler, it is an internal node
    // internal nodes are used to match nested routes
    handler?: Handler;

    children: Route[];

    // priority is used to determine the order of the routes.
    // routes with higher priority are matched first to ensure that.
    // deep traversal is prioritized over shallow traversal.
    // TODO: update priority is incremented only when a sub-route has a handler.
    priority: number;

    constructor(path: string, handler?: Handler) {
        this.path = path;
        this.handler = handler;
        this.children = [];
        this.priority = 0;
    }
}

export class Router {
    #trees: Record<string, Route>;

    constructor() {
        this.#trees = {};
        this.requestListener = this.requestListener.bind(this);
    }

    #add(method: string, path: string, handler: Handler) {
        let curr = this.#trees[method];

        if (!curr) {
            this.#trees[method] = curr = new Route('');
        }

        const params = [];

        if (path === curr.path) {
            curr.handler = handler;
        } else {
            // increment the priority of the root node
            // is this strictly necessary? ¯\_(ツ)_/¯
            curr.priority++;

            const segments = path.split('/').filter(Boolean);
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];

                const child = curr.children.find((c) => c.path === segment);
                const route = new Route(segment);

                // could (read "should") probably find a different, more memory efficient way to do this
                // but that's for future me to figure out (smile)
                // also, this is a very naive implementation of path parameters
                // it doesn't handle edge cases like /api/v1/users/:id/posts/:filename (this is a
                // comment from copilot, and it's wrong lol)
                //
                // but seriously this should be handled differently.
                // my first iteration was to traverse the tree backwards from the matched route
                // and collect the parameters that way, but that ends up with being more time
                // consuming at runtime and at the cost of response time.
                //
                // so fuck your ram
                if (segment.startsWith(':')) {
                    params.push({ key: segment.slice(1), position: i });
                }

                if (!child) {
                    curr.children.push(route);
                    curr = route;
                } else {
                    curr = child;
                }

                curr.priority++;
                curr.children.sort((a, b) => b.priority - a.priority);
            }

            curr.handler = handler;
            curr.params = params;
        }
    }

    #find(method: string, path: string): Route | undefined {
        // breadth first search to find route whose route and method matches incoming request.
        // curr.children are sorted by how many children each child has.
        // this is done in an effort to check the longest path first.

        const segments = path.split('/').filter(Boolean);
        const matchingSegmets: string[] = [];

        const q = new Queue<Route>();
        q.enqueue(this.#trees[method] || new Route(''));

        let curr: Route | undefined;

        let i = 0;
        while (q.length) {
            curr = q.deque();

            if (!segments[i]) {
                break;
            }

            for (let j = 0; j < curr.children.length; j++) {
                const child = curr.children[j];

                if (
                    child.path.startsWith(':') ||
                    (child.path.startsWith('*') && extname(path) === extname(child.path)) ||
                    child.path === segments[i]
                ) {
                    q.enqueue(child);
                    matchingSegmets.push(segments[i]);
                }
            }

            i++;
        }

        return matchingSegmets.join('/') === segments.join('/') ? curr : undefined;
    }

    notFoundHandler(req: Request, res: Response) {
        res.statusCode = 404;
        res.statusMessage = STATUS_CODES[404];
        res.end();
    }

    methodNotAllowedHandler(req: Request, res: Response) {
        res.statusCode = 405;
        res.statusMessage = STATUS_CODES[405];
        res.end();
    }

    get(path: string, handler: Handler) {
        this.#add('get', path, handler);
    }

    post(path: string, handler: Handler) {
        this.#add('post', path, handler);
    }

    put(path: string, handler: Handler) {
        this.#add('put', path, handler);
    }

    patch(path: string, handler: Handler) {
        this.#add('patch', path, handler);
    }

    delete(path: string, handler: Handler) {
        this.#add('delete', path, handler);
    }

    requestListener(req: IncomingMessage, res: ServerResponse) {
        const [url = '', query = ''] = req.url.split('?');
        const method = req.method.toLowerCase();

        const route = this.#find(method, url);

        (req as Request).params = new Map<string, string>();
        (req as Request).query = new URLSearchParams(query);
        (req as Request).filename = '';

        // if a route is not found, check the other trees for a matching route
        // if one is found, respond 405
        // otherwise, respond 404
        if (!route || !route.handler) {
            const methods = Object.keys(this.#trees).filter((m) => m !== method);
            for (let i = 0; i < methods.length; i++) {
                const found = this.#find(methods[i], url);
                if (found && found.handler) {
                    return this.methodNotAllowedHandler.call(null, req as Request, res as Response);
                }
            }

            return this.notFoundHandler.call(null, req as Request, res as Response);
        }

        // get param values
        const urlSegments = url.split('/').filter(Boolean);
        for (let i = 0; i < route.params.length; i++) {
            const param = route.params[i];
            (req as Request).params.set(param.key, urlSegments[param.position]);
        }

        // get filename if route has a wildcard
        if (route.path.startsWith('*')) {
            (req as Request).filename = extname(url) === extname(route.path) ? basename(url) : '';
        }

        route.handler.call(null, req as Request, res as Response);
    }
}
