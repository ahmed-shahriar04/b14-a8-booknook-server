# 📚 BookNook Backend API (Express.js + MongoDB + JWT)

> **Server Repository**: [https://github.com/ahmed-shahriar04/b14-a8-booknook-server](https://github.com/ahmed-shahriar04/b14-a8-booknook-server)  
> **Client Repository**: [https://github.com/ahmed-shahriar04/b14-a8-booknook-client](https://github.com/ahmed-shahriar04/b14-a8-booknook-client)  
> **Live Client**: [https://booknooktoday.vercel.app](https://booknooktoday.vercel.app)  
> **Author**: [Shahriar Ahmed Riaz](https://shahriarahmedriaz.netlify.app/)

RESTful API backend for BookNook library web application built strictly with pure JavaScript ES modules.

## Endpoints Implemented

1. `GET /books` - Get all books (with search, category filter, sort, limit).
2. `GET /books/:id` - Get details of a single book.
3. `POST /books` - Add a new book (Protected with JWT).
4. `PATCH /books/:id` - Update book details (Protected with JWT & author verification).
5. `DELETE /books/:id` - Delete a book (Protected with JWT & author verification).
6. `POST /borrows` - Borrow a book (Protected with JWT, double-borrow prevention, `$inc: -1` totalCopies).
7. `GET /borrows` - Get logged-in user's borrowed books (Protected with JWT).
8. `DELETE /borrows/:id` - Return a book (Protected with JWT, `$inc: +1` totalCopies).

## Setup
1. Copy `.env.example` to `.env` and fill in `MONGODB_URI` and `JWT_SECRET`.
2. Run `npm install`
3. Run `npm run dev`

