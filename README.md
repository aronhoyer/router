# A simple Node.js router

This router was made as an experiment to see if I could make a router that let me raw dog more of
Node's built-in modules in a "back to monkey" type effort.

Also, I've learned a bit about trees now (smile).

Whereas libraries like Express, Koa and Hapi are entire server frameworks, this library is a router
and nothing else. It was never meant to be something else and will never be anything else.

> [!WARNING]
> Do not use this in production code. This was a pet project and I don't plan to regularily maintain it.
> However, if you've read the [source](./src/router.ts) and understand it, feel free to fork it.

## Install

```sh
git clone https://github.com/aronhoyer/router.git && cd router
npm i && npm run build && npm ln
cd /path/to/your/project && npm ln router
```

## Usage

```ts
import http from 'node:http'
import { Router } from 'router'

const router = new Router()

const server = http.createServer(router.requestListener)
```

## Register a route

```ts
router.get("/path", (req, res) => {})
router.post("/path", (req, res) => {})
router.patch("/path", (req, res) => {})
router.put("/path", (req, res) => {})
router.delete("/path", (req, res) => {})
```

### Path params

Path params are accessible through the `params` key on the `req` object.

It is of type `Map<string, string>`.

```ts
router.get("/todo/:id", (req, res) => {
    const id = req.params.get("id")

    // do stuff
})
```

### URL search parameters

URL search params are on the `req` object, under the `query` key.

It is of type [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams).

```ts
router.get("/todos", (req, res) => {
    const limit = req.query.get('limit')
    const offset = req.query.get('query')

    // do stuff
})
```

### Filename wildcards

```ts
router.get("/css/*.css", (req, res) => {
    const { filename } = req

    // do stuff
})
```

## Middlewares

Making middlewares is pretty simple. However, if you require a middleware to trigger across all your
routes, you'd need to set up your server in a different way than [demoed above](#usage).

Below is an example of a middleware that blocks a list of IP addresses.

> [!WARNING]
> Don't see this as an example of a good version of doing this.

```ts
import { Server, STATUS_CODES } from 'node:http';
import { Router } 'router';

import { ipIsBlacklisted } from './some-module'

const router = new Router();

const server = new Server();

server.on('request', (req, res) => {
    if (ipIsBlacklisted(req.headers['x-forwarded-for'] || req.socket.remoteAddress) {
        res.statusCode = 403;
        res.end(STATUS_CODES[403]);
    } else {
        router.requestListener(req, res);
    }
})

server.listen(42069);
```

However, if you only need per-route middlewares, you can simply make curried functions that return
a `Handler`:

```ts
import { Router, Handler, Request, Response } from 'router';

function requiresAuthorization(handler: Handler): Handler {
    return function(req: Request, res: Response) {
        if (!userIsAuthorized()) {
            res.stautsCode = 403;
            res.end();
        } else {
            handler(req, res);
        }
    }
}

const router = new Router();

router.get('/secure', requiresAuthorization((req, res) => {
    // secret stuff
}));
```
