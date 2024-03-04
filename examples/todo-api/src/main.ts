import http from 'node:http';
import { Surreal } from 'surrealdb.js';

import { Router } from '../../../src/router';
import { Todo, TodoConstructor } from './todo';

async function main() {
    const router = new Router();
    const db = new Surreal();

    try {
        await db.connect(process.env.DB_URL);
        await db.use({ namespace: process.env.DB_NAME, database: process.env.DB_NAME });

        router.post('/todos', (req, res) => {
            if (!req.headers['content-type']?.includes('application/json')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid content type' }));
            } else {
                let data = '';
                req.on('data', (chunk) => {
                    data += chunk;
                });

                req.on('end', async () => {
                    const todo = Todo.fromJSON(data);
                    todo.createChecksum();
                    const [created] = await db.insert<TodoConstructor, Record<string, unknown>>(
                        'todo',
                        todo.toDBInput(),
                    );

                    res.statusCode = 201;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(Todo.fromDBResponse(created)));
                });
            }
        });

        router.get('/todos', async (_, res) => {
            let todos = await db.select<TodoConstructor>('todo');
            todos = todos.map(Todo.fromDBResponse) as Todo[];

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(todos));
        });

        router.get('/todos/:id', async (req, res) => {
            try {
                const todo = Todo.fromDBResponse(
                    await db.select(`todo:\`${req.params.get('id')}\``)[0],
                );
                res.setHeader('Content-Type', 'application/json');

                if (!todo) {
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Not found' }));
                } else {
                    res.end(JSON.stringify(todo));
                }
            } catch (error) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        });

        router.patch('/todos/:id', async (req, res) => {
            if (!req.headers['content-type']?.includes('application/json')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid content type' }));
            } else {
                let data = '';
                req.on('data', (chunk) => {
                    data += chunk;
                });

                req.on('end', async () => {
                    try {
                        const [todo] = await db.select<TodoConstructor>(
                            `todo:\`${req.params.get('id')}\``,
                        );

                        if (!todo) {
                            res.statusCode = 404;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(
                                JSON.stringify({
                                    error: `Todo with ID "${req.params.get('id')}" wasn't found`,
                                }),
                            );
                        } else {
                            const oldTodo = Todo.fromDBResponse(todo);
                            const newTodo = Todo.fromDBResponse({
                                ...todo,
                                ...JSON.parse(data),
                            });
                            newTodo.createChecksum();

                            if (oldTodo.checksum === newTodo.checksum) {
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify(oldTodo));
                            } else {
                                let [updated] = await db.merge(
                                    `todo:\`${req.params.get('id')}\``,
                                    JSON.parse(data),
                                );
                                updated = Todo.fromDBResponse(updated) as Todo;
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify(updated));
                            }
                        }
                    } catch (error) {
                        console.log(error);
                        res.statusCode = 400;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error }));
                    }
                });
            }
        });

        const server = new http.Server();

        server.on('request', router.requestListener);

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
                    `${Date.now() - start} ms`,
                ].filter(Boolean);

                console.log(messages.join(' '));
            });
        });

        const PORT = Number(process.env.PORT) || 42069;

        server.on('listening', () => {
            console.log(`Server is listening on :${PORT}`);
        });

        server.listen(PORT);
    } catch (error) {
        console.error(error);
    }
}

main();
