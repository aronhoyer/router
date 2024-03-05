import assert from 'node:assert';
import { test } from 'node:test';

import { Queue } from './queue';

test('Queue', () => {
    const list = new Queue<number>();

    list.enqueue(5);
    list.enqueue(7);
    list.enqueue(9);

    assert.strictEqual(list.deque(), 5);
    assert.strictEqual(list.length, 2);

    list.enqueue(11);

    assert.strictEqual(list.deque(), 7);
    assert.strictEqual(list.deque(), 9);
    assert.strictEqual(list.deque(), 11);
    assert.strictEqual(list.deque(), undefined);
    assert.strictEqual(list.length, 0);

    list.enqueue(69);
    assert.strictEqual(list.length, 1);
});
