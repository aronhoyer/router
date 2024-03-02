class Node<T> {
    value: T;
    next?: Node<T>;

    constructor(value: T) {
        this.value = value;
    }
}

export class Queue<T> {
    length = 0;
    #head?: Node<T>;
    #tail?: Node<T>;

    enqueue(value: T) {
        const node = new Node(value);

        this.length++;

        if (!this.#head || !this.#tail) {
            this.#head = this.#tail = node;
        } else {
            this.#tail.next = node;
            this.#tail = node;
        }
    }

    deque(): T | undefined {
        if (!this.#head) {
            return undefined;
        }

        this.length--;

        const value = this.#head.value;
        this.#head = this.#head.next;

        return value;
    }
}
