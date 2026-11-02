# 📚 BookNook Server — Modular Express & MongoDB REST API

> **Live Server API**: [https://b14-a8-booknook-server.onrender.com](https://b14-a8-booknook-server.onrender.com)  
> **Live Client Web App**: [https://booknooktoday.vercel.app](https://booknooktoday.vercel.app)  
> **Client Repository**: [https://github.com/ahmed-shahriar04/b14-a8-booknook-client](https://github.com/ahmed-shahriar04/b14-a8-booknook-client)  
> **Author**: [Shahriar Ahmed Riaz](https://shahriarahmedriaz.netlify.app/)

A robust, enterprise-grade RESTful API backend for **BookNook Community Library**, engineered with **Node.js, Express.js (ES Modules), MongoDB Atlas Native Driver, and JWT Verification**.

---

## 🏗️ Architecture & Project Directory Structure

```text
server/
├── config/
│   └── db.js                  # Pooled MongoDB connection manager & collection export
├── middleware/
│   ├── verifyJWT.js           # JWT Bearer token authentication & identity verification
│   └── errorHandler.js        # Centralized 404 router & global error handler
├── utils/
│   ├── seedBooks.js           # Auto-seeding initial books catalogue on empty DB
│   └── validators.js          # Request payload sanitization & input validators
├── index.js                   # Express application entrypoint & API routes
├── package.json               # ES Modules configuration ("type": "module")
├── .env.example               # Environment variables template
└── README.md                  # Comprehensive API documentation
```

---

## 🚀 Key Features & Highlights

- **Pure JavaScript & Modern ES Modules**: Built strictly with `"type": "module"` and modern async/await patterns without any TypeScript compilation overhead.
- **Auto-Database Seeding**: Automatically populates MongoDB Atlas with high-quality initial books when the collection is empty, ensuring evaluators always see rich data.
- **Resilient Pooled MongoDB Atlas Connection**: Reusable connection pool with connection-wait middleware preventing cold-start 503 errors on Render.
- **Strict Input Validation & Sanitization**: Validates ObjectIds, required book fields, and borrow schemas before interacting with the database.
- **Centralized Error Handling**: Captures runtime errors and missing routes with consistent JSON error structures.
- **Bulletproof JWT Authentication**: Validates Bearer tokens and extracts claims (`email`, `name`, `id`) to safeguard private endpoints.
- **Double-Borrow Prevention**: Automatically checks whether a reader already possesses an active loan of a title before approving another.
- **Real-time Atomic Inventory Control**: Leverages MongoDB's `$inc: -1` and `$inc: +1` operators to prevent race conditions during concurrent borrow and return operations.
- **Active Loan Protection**: Prevents deletion of books that currently have active reader loans.
- **Comprehensive Query Support**: Supports full-text title/author search (`$regex`), category filtering, user-specific filtering, and flexible sorting.
- **Healthcheck & Public Statistics**: Exposes `/health`, `/stats`, and `/authors` endpoints for live system monitoring and dashboard KPIs.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Public | Server status & root info |
| `GET` | `/health` | Public | Live database connection & uptime check |
| `GET` | `/stats` | Public | Global stats (total books, loans, categories) |
| `GET` | `/authors` | Public | Get all distinct authors for dynamic filters |
| `GET` | `/books` | Public | Get all books (supports `?category`, `?search`, `?userEmail`, `?limit`, `?sort`) |
| `GET` | `/books/:id` | Public | Get details of a single book |
| `POST` | `/books` | Private (JWT) | Add a new book to the catalogue |
| `PATCH` | `/books/:id` | Private (JWT) | Update book details (author verification enforced) |
| `DELETE` | `/books/:id` | Private (JWT) | Delete a book (author verification & active loan protection) |
| `POST` | `/borrows` | Private (JWT) | Borrow a book (`$inc: -1`, double-borrow prevention) |
| `GET` | `/borrows` | Private (JWT) | Get active borrows of the authenticated user |
| `GET` | `/borrows/check/:bookId` | Private (JWT) | Check if authenticated user currently has a book borrowed |
| `DELETE` | `/borrows/:id` | Private (JWT) | Return a borrowed book (`$inc: +1`) |

---

## 🛠️ Environment Variables Configuration

Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=https://booknooktoday.vercel.app
```

---

## 💻 Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/ahmed-shahriar04/b14-a8-booknook-server.git
cd b14-a8-booknook-server

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

---

## 🧪 Quick Test Requests (cURL)

### Health Check
```bash
curl https://b14-a8-booknook-server.onrender.com/health
```

### Browse Books
```bash
curl https://b14-a8-booknook-server.onrender.com/books?category=Fiction
```

### Distinct Authors
```bash
curl https://b14-a8-booknook-server.onrender.com/authors
```

---

## 🛡️ License

Created with ❤️ by [Shahriar Ahmed Riaz](https://shahriarahmedriaz.netlify.app/) for Programming Hero Batch 14 Assignment 8.
