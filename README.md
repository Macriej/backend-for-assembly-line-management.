# Assembly Line Manager – Backend

REST API for managing products, assembly lines, workstations and allocation order in a manufacturing process. The project is built with Node.js, TypeScript, Express and Prisma using PostgreSQL.

## Overview

This backend supports:

- user registration and login with JWT authentication
- CRUD for products
- CRUD for assembly lines
- CRUD for workstations
- allocation of workstations to assembly lines
- secure reordering and deletion of allocations within the correct assembly line
- seed data for demo scenarios
- integration tests using Jest + Supertest

## Tech stack

- Node.js 20+
- TypeScript 5+
- Express 4
- Prisma ORM
- PostgreSQL
- JWT (jsonwebtoken)
- Zod validation
- Jest + Supertest
- Docker Compose

## Requirements

- Node.js 20+
- Docker & Docker Compose
- Optional: local PostgreSQL instance if you want to run without Docker

## Quick start (recommended)

The simplest way is to use Docker Compose:

```bash
docker compose up --build
```

This starts:

- PostgreSQL database on port `5432`
- API on port `3000`

On first startup, the API runs Prisma migrations and seeds demo data automatically.

After startup, the application is available at:

```text
http://localhost:3000/api
```

## Local development setup

If you want to run the app locally without Docker:

1. Install dependencies

```bash
npm install
```

2. Copy environment variables

```bash
cp .env.example .env
```

3. Start the database only

```bash
docker compose up -d db
```

4. Run Prisma migrations

```bash
npx prisma migrate dev --name init
```

5. Seed sample data (optional, but recommended)

```bash
npm run db:seed
```

6. Start the backend

```bash
npm run dev
```

## Environment variables

The project expects the following variables:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/assembly_line?schema=public"
JWT_SECRET="change-me-to-a-long-random-string"
PORT=3000
```

The file `.env.example` already contains the default values for local development.

## Default credentials

After seeding, the demo user is available:

| Email | Password |
| --- | --- |
| admin@example.com | admin123 |

## API endpoints

All protected routes require the `Authorization` header with a valid JWT token.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create a new user |
| POST | `/api/auth/login` | Authenticate user and return JWT |
| GET | `/api/products` | List all products |
| POST | `/api/products` | Create a product |
| GET | `/api/products/:id` | Read one product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/assembly-lines` | List assembly lines; supports `?productId=` filter |
| POST | `/api/assembly-lines` | Create an assembly line |
| GET | `/api/assembly-lines/:id` | Read one assembly line |
| PUT | `/api/assembly-lines/:id` | Update assembly line |
| DELETE | `/api/assembly-lines/:id` | Delete assembly line |
| GET | `/api/workstations` | List all workstations |
| POST | `/api/workstations` | Create workstation |
| GET | `/api/workstations/:id` | Read one workstation |
| PUT | `/api/workstations/:id` | Update workstation |
| DELETE | `/api/workstations/:id` | Delete workstation |
| POST | `/api/assembly-lines/:lineId/allocations` | Allocate workstation to a line |
| PUT | `/api/assembly-lines/:lineId/allocations/reorder` | Reorder allocations for a specific line |
| DELETE | `/api/assembly-lines/:lineId/allocations/:allocationId` | Remove allocation only if it belongs to the given line |

### Authorization example

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

Example of a protected request:

```bash
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer <jwt-token>"
```

## Data model

The database schema includes:

- `User` — authentication account
- `Product` — product family assigned to assembly lines
- `AssemblyLine` — production line linked to a product
- `Workstation` — station in the manufacturing process
- `Allocation` — mapping between a line and a workstation plus order index

The `Allocation` model uses a unique constraint on `(assemblyLineId, workstationId)` to prevent duplicate allocations on the same line.

## Implementation notes

### Security and ownership validation

The most important business rule is that allocation operations never trust the ID alone.

When reordering or deleting allocations, the API verifies that the allocation belongs to the exact assembly line in the URL. This prevents misuse such as reordering an allocation from one line through another line’s endpoint.

### Centralized error handling

The app uses a global error middleware to convert Prisma errors and custom app errors into clean HTTP responses.

Examples:

- 404: resource not found
- 409: unique constraint violation
- 400: invalid input
- 500: unexpected server failure

### Environment validation

The application validates `.env` values at startup using Zod. Missing or invalid configuration causes a fast, explicit failure instead of running insecurely.

## Tests

The project includes integration tests for authentication and assembly-line allocation logic.

```bash
npm test
```

Current validation status:

- 2 test suites passing
- 10 tests passing

## Project structure

```text
.
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── __tests__/
│   ├── lib/
│   ├── middleware/
│   ├── routes/
│   ├── utils/
│   ├── config.ts
│   └── index.ts
└── tsconfig.json
```

## Notes

The seeded sample data includes products, workstations and assembly lines inspired by the challenge requirements, plus one example allocation on the `Convey line` to demonstrate ordering behavior.
