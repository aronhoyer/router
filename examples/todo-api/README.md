# Router Todo API example app

## Running the app

> [!NOTE]
> This example app requires you to have Docker installed.
> If you don't have Docker installed, you can install it [here](https://www.docker.com/products/docker-desktop).

1. Start a SurrealDB instance `docker run --rm --pull always -p 8000:8000 surrealdb/surrealdb:latest start`
2. Start the app `[PORT=42069 ]DB_URL=ws://127.0.0.1:8000 DB_NAME=todos npm run dev`
