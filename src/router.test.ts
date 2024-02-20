import test, { after, before, describe } from "node:test"
import http, { Server } from "node:http"
import { Router } from "./router"
import assert from "node:assert"

type Response = {
    headers: http.IncomingHttpHeaders
    statusCode: number
    statusMessage: string
    data: string
}

function request(url: string, method?: string): Promise<Response> {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method: method || "GET" }, (res) => {
            res.on("error", reject)

            let data = ""
            res.on("data", (c) => {
                data += c
            })

            res.on("end", () => {
                resolve({
                    headers: res.headers,
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    data,
                })
            })
        })

        req.on("error", reject)
        req.end()
    })
}

describe("Router", () => {
    let server: Server | undefined

    before(() => {
        const router = new Router()

        router.GET("/get", (_, res) => {
            res.end("GET")
        })

        router.POST("/post", (_, res) => {
            res.end("POST")
        })

        router.PATCH("/patch", (_, res) => {
            res.end("PATCH")
        })

        router.PUT("/put", (_, res) => {
            res.end("PUT")
        })

        router.DELETE("/delete", (_, res) => {
            res.end("DELETE")
        })

        router.GET("/books", (req, res) => {
            res.end(req.query.toString())
        })

        router.GET("/books/:id", (req, res) => {
            res.end(req.params.get("id"))
        })

        router.GET("/a/:b/c/:d", (req, res) => {
            res.end(`${req.params.get("b")} ${req.params.get("d")}`)
        })

        server = http.createServer(router.requestListener)
        server.on("listening", () => {
            console.log("test server listening on :42069")
        })
        server.listen(42069)
    })

    after(() => {
        server.close((err) => {
            if (err) {
                console.log(err)
            }
        })
    })

    test("default statuses", async (t) => {
        await t.test("404 not found", async () => {
            const res = await request("http://127.0.0.1:42069/notfound")
            assert.equal(res.statusCode, 404)
        })

        await t.test("405 method not allowed", async () => {
            const res = await request("http://127.0.0.1:42069/get", "POST")
            assert.equal(res.statusCode, 405)
        })
    })

    test("http verbs", async (t) => {
        const verbs = ["GET", "POST", "PATCH", "PUT", "DELETE"]

        for (let i = 0; i < verbs.length; i++) {
            const verb = verbs[i]
            await t.test(verb, async () => {
                const res = await request(`http://127.0.0.1:42069/${verb}`, verb)
                assert.equal(res.statusCode, 200)
                assert.equal(res.data, verb)
            })
        }
    })

    test("body gets sent", async () => {
        const res = await request("http://127.0.0.1:42069/get", "POST")
        assert.notEqual(res.data.length, 0)
    })

    test("url params are accepted", async () => {
        const res = await request("http://127.0.0.1:42069/books/abc123")
        assert.equal(res.statusCode, 200)
        assert.equal(res.data, "abc123")
    })

    test("nested url params are accepted", async () => {
        const res = await request("http://127.0.0.1:42069/a/b/c/d")
        assert.equal(res.statusCode, 200)
        assert.equal(res.data, "b d")
    })

    test("url search params are parsed", async () => {
        const params = new URLSearchParams({
            limit: "20",
            offset: "2",
        })

        const res = await request(`http://127.0.0.1:42069/books?${params.toString()}`)
        assert.equal(res.statusCode, 200)
        assert.equal(res.data, params.toString())
    })
})
