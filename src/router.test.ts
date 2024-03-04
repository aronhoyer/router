import assert from 'node:assert';
import { describe, test, after, before } from 'node:test';
import http from 'node:http';

import { Router } from './router';

type ClientResponse = {
    statusCode: number;
    statusMessage: string;
    data: string;
    headers: http.IncomingHttpHeaders;
};

async function request(url: string, method?: string): Promise<ClientResponse> {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method: method || 'GET' }, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('error', reject);

            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    data: data,
                    headers: res.headers,
                });
            });
        });

        req.on('error', reject);
        req.end();
    });
}

describe('Router Tests', () => {
    let server: http.Server;
    let router: Router;

    before(() => {
        router = new Router();
        server = http.createServer(router.requestListener);

        server.listen(42069);
    });

    after(() => {
        if (server) {
            server.close((err) => {
                if (err) {
                    console.error(err);
                }
            });
        }
    });

    test('should respond 404 at root when there is no handler', async () => {
        const res = await request('http://127.0.0.1:42069');
        assert.strictEqual(res.statusCode, 404);
    });

    test('should handle GET request at root', async () => {
        let isHandlerCalled = false;
        router.get('/', (req, res) => {
            isHandlerCalled = true;
            res.end();
        });

        const res = await request('http://127.0.0.1:42069');

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(isHandlerCalled, true);
    });

    test('should handle GET request with valid path', async () => {
        let isHandlerCalled = false;
        router.get('/api/v1/users', (req, res) => {
            isHandlerCalled = true;
            res.end();
        });

        const res = await request('http://127.0.0.1:42069/api/v1/users');

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(isHandlerCalled, true);
    });

    test('should handle POST request with valid path', async () => {
        let isHandlerCalled = false;
        router.post('/api/v1/users', (req, res) => {
            isHandlerCalled = true;
            res.end();
        });

        const res = await request('http://127.0.0.1:42069/api/v1/users', 'POST');

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(isHandlerCalled, true);
    });

    test('should handle route with path parameter', async () => {
        let isHandlerCalled = false;
        let params: Map<string, string> = new Map();
        router.get('/api/v1/users/:id', async (req, res) => {
            isHandlerCalled = true;
            params = req.params;
            res.end();
        });

        const res = await request('http://127.0.0.1:42069/api/v1/users/123');

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(params.get('id'), '123');
        assert.strictEqual(isHandlerCalled, true);
    });

    test('should handle route with search query', async () => {
        let isHandlerCalled = false;
        let query = '';
        router.get('/api/v1/users', (req, res) => {
            isHandlerCalled = true;
            query = req.query.toString();
            res.end();
        });

        const res = await request('http://127.0.0.1:42069/api/v1/users?name=John&age=25');
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(query, 'name=John&age=25');
        assert.strictEqual(isHandlerCalled, true);
    });

    test('should handle route with wildcard in path', async () => {
        let isHandlerCalled = false;
        let filename = '';
        router.get('/api/v1/files/*.css', (req, res) => {
            isHandlerCalled = true;
            filename = req.filename;
            res.end();
        });

        const res = await request('http://127.0.0.1:42069/api/v1/files/styles.css');

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(filename, 'styles.css');
        assert.strictEqual(isHandlerCalled, true);
    });

    test("should respond 404 extnames don't match", async () => {
        let isHandlerCalled = false;
        router.get('/api/v1/files/*.css', (req, res) => {
            isHandlerCalled = true;
            res.end();
        });

        const res = await request('http://127.0.0.1:42069/api/v1/files/styles.js');

        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(isHandlerCalled, false);
    });

    test('should handle not found route', async () => {
        const res = await request('http://127.0.0.1:42069/not-found');

        assert.strictEqual(res.statusCode, 404);
    });

    test('should handle method not allowed', async () => {
        const res = await request('http://127.0.0.1:42069/api/v1/users', 'PATCH');

        assert.strictEqual(res.statusCode, 405);
    });
});
