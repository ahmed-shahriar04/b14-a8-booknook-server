# 📚 BookNook Server — Library REST API

> **Live Server API**: [https://b14-a8-booknook-server.onrender.com](https://b14-a8-booknook-server.onrender.com)  
> **Live Client Web App**: [https://booknooktoday.vercel.app](https://booknooktoday.vercel.app)  
> **Client Repository**: [https://github.com/ahmed-shahriar04/b14-a8-booknook-client](https://github.com/ahmed-shahriar04/b14-a8-booknook-client)  
> **Author**: [Shahriar Ahmed Riaz](https://shahriarahmedriaz.netlify.app/)

A robust, enterprise-grade RESTful API backend for **BookNook Community Library**, engineered with **Node.js, Express.js (ES Modules), MongoDB Atlas Native Driver, and JWT Verification**.

---

## 🚀 Key Features & Highlights

- **Pure JavaScript & Modern ES Modules**: Built strictly with `"type": "module"` and modern async/await patterns.
- **Resilient MongoDB Atlas Integration**: Configured with automated connection lifecycle and connection pool.
- **Bulletproof JWT Authentication Middleware**: Verifies bearer tokens and extracts claims (`email`, `name`, `id`) to safeguard private endpoints.
- **Double-Borrow Prevention**: Automatically checks whether a reader already possesses an active loan of a title before approving another.
- **Real-time Atomic Inventory Control**: Leverages MongoDB's `$inc: -1` and `$inc: +1` operators to prevent race conditions during concurrent borrow and return operations.
- **Loan Protection on Deletion**: Prevents deletion of books that currently have active reader loans.
- **Comprehensive Query Support**: Supports full-text title/author search (`$regex`), category filtering, user-specific filtering, and flexible sorting.
- **Healthcheck & Public Statistics**: Exposes `/health` and `/stats` endpoints for live system monitoring and dashboard KPIs.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Public | Server status & root info |
| `GET` | `/health` | Public | Live database connection & uptime check |
| `GET` | `/stats` | Public | Global stats (total books, loans, categories) |
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

## 🛡️ License

Created with ❤️ by [Shahriar Ahmed Riaz](https://shahriarahmedriaz.netlify.app/) for Programming Hero Batch 14 Assignment 8.
