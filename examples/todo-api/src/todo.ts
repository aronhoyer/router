import crypto from 'node:crypto';
import { ActionResult } from 'surrealdb.js/script/types';

export type TodoConstructor = {
    id: string;
    title: string;
    description: string;
    dueDate?: Date;
    done: boolean;
    createdAt: Date;
    updatedAt: Date;
    checksum: string;
};

export class Todo {
    id: string;
    title: string;
    description: string;
    dueDate?: Date;
    done: boolean;
    createdAt: Date;
    updatedAt: Date;
    checksum: string;

    constructor(data: Partial<TodoConstructor> = {}) {
        this.id = data.id || crypto.randomUUID();
        this.title = data.title || '';
        this.description = data.description || '';
        this.dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
        this.done = data.done || false;
        this.checksum = this.createChecksum();

        if (data.createdAt && !Number.isNaN(new Date(data.createdAt).valueOf())) {
            this.createdAt = new Date(data.createdAt);
        } else {
            this.createdAt = new Date();
        }

        if (data.updatedAt && !Number.isNaN(new Date(data.updatedAt).valueOf())) {
            this.updatedAt = new Date(data.updatedAt);
        } else {
            this.updatedAt = new Date();
        }
    }

    createChecksum(): string {
        return crypto
            .createHash('sha256')
            .update(
                JSON.stringify({
                    title: this.title,
                    description: this.description,
                    done: this.done,
                }),
            )
            .digest('hex');
    }

    static fromJSON(json: string): Todo {
        const obj = JSON.parse(json) as Partial<TodoConstructor>;
        const todo = new Todo(obj);
        return todo;
    }

    static fromDBResponse(response: ActionResult<TodoConstructor>): Todo {
        return new Todo({
            id: response.id.substring('todo:('.length, response.id.length - 1),
            title: response.title,
            description: response.description,
            dueDate: response.dueDate ? new Date(response.dueDate) : undefined,
            done: response.done,
            createdAt: new Date(response.createdAt),
            updatedAt: new Date(response.updatedAt),
        });
    }

    toDBInput() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            dueDate: this.dueDate?.toISOString(),
            done: this.done,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            checksum: this.checksum,
        };
    }
}
