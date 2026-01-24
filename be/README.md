# MikroTik Monitoring Backend

Backend service for monitoring MikroTik routers and PPP users. Built with NestJS and Prisma.

## Description

This application communicates with MikroTik routers via the API to fetch and monitor PPP active users and secrets. It provides a REST API for the frontend to consume.

## Project setup

```bash
$ npm install
```

## Configure Environment

Make sure to create a `.env` file with the necessary configuration, including `DATABASE_URL` and other required variables.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Build

```bash
$ npm run build
```

The build output will be located in `dist/src`.

## License

[UNLICENSED](LICENSE)
