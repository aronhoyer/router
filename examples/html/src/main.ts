import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import { Router } from '../../../src/router';

const router = new Router();

const STATIC_DIR = path.join(__dirname, '../static');

router.notFoundHandler = (req, res) => {
    const file = path.join(STATIC_DIR, '404.html');
    const stream = fs.createReadStream(file);

    stream.on('error', () => {
        res.writeHead(404);
        res.end();
    });

    stream.on('open', () => {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        stream.pipe(res);
    });
};

router.get('/', async (req, res) => {
    const file = path.join(STATIC_DIR, 'index.html');
    const stream = fs.createReadStream(file);

    stream.on('error', () => {
        res.writeHead(404);
        res.end();
    });

    stream.on('open', () => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        stream.pipe(res);
    });
});

router.get('/css/style.css', async (req, res) => {
    const file = path.join(STATIC_DIR, 'css/style.css');
    const stream = fs.createReadStream(file);

    stream.on('error', () => {
        res.writeHead(404);
        res.end();
    });

    stream.on('open', () => {
        res.writeHead(200, { 'Content-Type': 'text/css' });
        stream.pipe(res);
    });
});

router.get('/js/*.js', async (req, res) => {
    const file = path.join(STATIC_DIR, req.url);
    const stream = fs.createReadStream(file);

    stream.on('error', () => {
        res.writeHead(404);
        res.end();
    });

    stream.on('open', () => {
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        stream.pipe(res);
    });
});

const server = http.createServer(router.requestListener);

server.on('request', (req, res) => {
    const start = Date.now();

    res.on('finish', () => {
        const messages = [
            req.headers.origin,
            req.headers['user-agent'],
            req.method,
            req.url,
            res.statusCode,
            `(${res.statusMessage})`,
            `${Date.now() - start}ms`,
        ].filter(Boolean);

        console.log(messages.join(' '));
    });
});

server.on('listening', () => {
    console.log('Server is listening on port 8080');
});

server.listen(8080);
