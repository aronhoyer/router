# A simple Node.js router

This router was made as an experiment to see if I could make a router that let me raw dog more of
Node"s built-in modules in a "back to monkey" type effort.

Whereas libraries like Express, Koa and Hapi are entire server frameworks, this library is a router
and nothing else. It was never meant to be something else and will never be anything else.

> [!WARNING]
> Do not use this in production code. This was a pet project and I don't plan to regularily maintain it.
> However, if you've read the [source](./src/router.ts) and understand it, feel free to fork it.

## Getting started

```js
import http from "http"
import { Router } from "router"

const router = new Router()
const server = http.createServer(router.requestListener)

server.listen(8080)
```

### Creating your first route

```js
router.GET("/hello", (req, res) => {
    res.end("Hello, World!")
})
```

### URL parameters

Much like in most routers, URL paramteters are defined with a leading colon and is accessible in
your handlers in `req.params`.

> [!NOTE]
> `req.params` is a `Map<string, string>`, not `Record<string, string>`

```js
router.GET("/books/:isbn", (req, res) => {
    const book = db.getBook(req.params.get("isbn"))

    if (!book) {
        res.statusCode = 404
        return res.end()
    }

    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify(book))
})
```

### Filename wildcards

```js
router.GET("*.css", async (req, res) => {
    const file = await readStaticFile(req.filename)

    res.setHeader("Cache-Control", "public, max-age=86400")
    res.setHeader("Content-Type", "text/css")
    res.end(file)
})
```

### URL search parameters

Access URL search parameters through `req.query`.

> [!NOTE]
> `req.query` is of type [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)

```js
router.GET("/todos", async (req, res) => {
    const limit = req.query.get("limit")
    const offset = req.query.get("offset")
    const filters = req.query.getAll("filter")

    const todos = db.getTodos(limit, offset, filters)

    res.setHeader("Content-Type: application/json")
    res.end(JSON.stringify(todos))
})
```

### Parsing request body

This router library does nothing to the request body. It's on you to parse it, which is very easy:

```js
router.POST("/todo", (req, res) => {
    if (!req.headers["Content-Type"].includes("applications/json")) {
        res.statusCode = 400
        res.end()
    } else {
        let data = ""

        req.on("data", (chunk) => {
            data += chunk
        })

        req.on("end", async () => {
            try {
                const todo = db.createTodo(JSON.parse(data))

                res.setHeader("Content-Type", "application/json")
                res.statusCode = 201
                res.end(JSON.stringify(task))
            } catch (error) {
                res.statusCode = 500
                res.end(JSON.stringify({ error })
            }
        })
    }
})
```

## Tests

Tests are written and run with Node's built-in [assertion module](https://nodejs.org/api/assert.html) and [test runner](https://nodejs.org/api/test.html).

To run the tests, simply run `npm t[est]`.

## Contributing

Feel free to post pull requests to improve the code, although I don't guarantee I'll review it
posthaste (again, this is a pet project).
