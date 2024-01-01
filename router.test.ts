import http from "http"

import { Router } from "./router"

const router = new Router()

router.GET("/ping", (req, res) => {
    res.end("pong")
})

router.GET("/users/:username", (req, res) => {
    res.end(req.params.username)
})

const server = http.createServer(router.requestListener)

server.on("listening", () => {
    console.log("Server available on :8080")
})

server.listen(8080)
