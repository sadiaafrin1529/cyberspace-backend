# Cyberspace Backend

REST API for the Cyberspace platform, built with **Express 5**, **Prisma ORM** and **PostgreSQL**. It serves products, categories, inquiries, news, partners, banners, settings, users, job vacancies and applications, and solutions to the Cyberspace frontend ([`cyberspace-web`](https://github.com/mohammodrubel/CyberSpace)).

## Tech stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express 5
- **ORM:** Prisma Client (`prisma-client-js`)
- **Database:** PostgreSQL (Neon)
- **Auth:** JWT (access + refresh tokens), bcrypt password hashing, role based access (`ADMIN`, `SALES`)
- **Validation:** Zod
- **File storage:** Cloudinary for images, private disk storage for CVs
- **Email:** Nodemailer (SMTP) for job application notifications

## Architecture

Every module follows the same layers: **Route → Controller → Service → Prisma**.

```
src/app/modules/<module>/
  <module>.route.ts         routes + auth middleware
  <module>.controller.ts    request parsing, validation, response
  <module>.service.ts       business logic and database access
  <module>.validation.ts    Zod schemas (newer modules)
```

Shared pieces: `middlewares/auth.ts` (JWT + role check), `utils/sendResponse.ts` (uniform response envelope), `utils/catchAsync.ts`, `errors/AppError.ts` and the global error handler.

## Data model (Prisma)

| Model | Purpose |
|---|---|
| `Product`, `ProductTranslation` | Catalogue item (SKU, brand, category, price, stock) with per-language name and description |
| `Inquiry` | Customer inquiry on a product, optionally assigned to / submitted by a user |
| `User` | Admin and sales accounts |
| `Setting` | Key / boolean settings (for example show prices, show stock) |
| `Banner` | Hero banner slides |
| `Partner` | Partner logos with per-language description, category and supplies |
| `News`, `NewsTranslation` | Articles with per-language title, excerpt and body |
| `Category` | Product categories (slug, per-language name, image, order) |
| `Job`, `JobTranslation`, `JobApplication` | Vacancies (multilingual) and candidate applications with CV |
| `Solution`, `SolutionTranslation` | Solutions page content: slug, colour, icon, order, active flag; per language title, short description, key points, full description and SEO fields |

### Enums

`Lang` (`AZ`, `EN`, `RU`), `InquiryStatus`, `Role` (`ADMIN`, `SALES`), `NewsStatus`, `EmploymentType`, `WorkplaceType`, `JobStatus`, `JobApplicationStatus`, `EmailStatus`.

## API routes

Mounted in `src/app/routes/index.ts`:

| Path | Module |
|---|---|
| `/auth` | Login, register, refresh, logout |
| `/user` | User management and profile |
| `/products` | Product catalogue |
| `/inquiries` | Customer inquiries |
| `/settings` | App settings |
| `/banners` | Hero banners |
| `/partners` | Partners |
| `/news` | News articles |
| `/categories` | Product categories |
| `/jobs` | Vacancies (public: `/jobs/active`) |
| `/job-applications` | Applications and CV download |
| `/solutions` | Solutions (public: `/solutions/active`) |
| `/upload` | Image upload (Cloudinary) |

### Solutions API

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/solutions/active` | public | Active solutions only |
| GET | `/solutions/active/:slug` | public | One active solution (404 if unknown or inactive) |
| GET | `/solutions` | admin | List with `search`, `status=active\|inactive`, `page`, `limit` |
| GET | `/solutions/:id` | admin | One solution with all translations |
| POST | `/solutions` | admin | Create (English translation required, slug generated if omitted) |
| PATCH | `/solutions/:id` | admin | Update; only the languages sent are touched |
| PATCH | `/solutions/:id/status` | admin | `{ "isActive": boolean }` |
| PATCH | `/solutions/:id/order` | admin | `{ "order": number }` |
| DELETE | `/solutions/:id` | admin | Delete (translations cascade) |

Responses use `{ statusCode, success, message, meta?, data }`. Duplicate slugs return 409, invalid ids 400, missing records 404.

## Getting started

### Prerequisites

- Node.js (LTS) and npm
- A PostgreSQL database (this project uses Neon)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill it in:

```env
NODE_ENV=development
PORT=9000

DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

BCRYPT_SALT_ROUNDS=10
JWT_ACCESS_TOKEN_SECRET="<random-secret>"
JWT_REFRESH_TOKEN_SECRET="<random-secret>"
JWT_ACCESS_TOKEN_EXPIRES_IN="7d"
JWT_REFRESH_TOKEN_EXPIRES_IN="90d"

# Cloudinary (image uploads)
CLOUD_NAME=
API_KEY=
API_SECRET=

# SMTP (job application emails)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
HR_EMAIL=
# Optional: absolute path for private CV storage (default ./private-uploads/cvs)
CV_STORAGE_DIR=

# Optional integrations
STRIPE_SECRET_KEY=
PUBLISH_KEY=
DEEPSEEK_API_KEY=
API_URL=
```

Never commit `.env` or real secrets.

### 3. Generate the Prisma client and apply migrations

```bash
npx prisma generate
npx prisma migrate dev      # development
npx prisma migrate deploy   # production / CI
```

### 4. Run the server

```bash
npm run dev     # ts-node-dev, hot reload
npm run build   # compile to dist/
npm start       # run the compiled dist/server.js
```

The server listens on `PORT` (default `9000`).

## Scripts

| Script | Description |
|---|---|
| `dev` | Run with `ts-node-dev` (hot reload) |
| `build` | Compile TypeScript to `dist/` |
| `start` | Run the compiled server |
| `clean` | Remove `dist/` |
| `lint` / `lint:fix` | ESLint check / fix |
| `format` | Prettier |
| `seed` | Run `seed/seed.ts` |

## Prisma commands

```bash
npx prisma generate        # regenerate the client
npx prisma migrate dev     # create and apply a dev migration
npx prisma migrate deploy  # apply pending migrations
npx prisma studio          # browse data in a GUI
npx prisma validate        # validate schema.prisma
```

## Project structure

```
src/
  app/
    config/        environment config
    errors/        AppError, Zod error handler
    middlewares/   auth, optionalAuth, validateRequest, error handlers
    modules/       auth, user, product, category, inquiry, setting, banner,
                   partner, news, job, solution, upload
    routes/        route aggregator
    utils/         response helpers, Cloudinary upload, CV storage, mail, sanitising
  app.ts
  server.ts
prisma/
  schema.prisma
  migrations/
seed/
  seed.ts
```
