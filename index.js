import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ObjectId } from 'mongodb';
import { connectDB, getCollections } from './config/db.js';
import { checkAndSeedDatabase } from './utils/seedBooks.js';
import { validateBookInput, validateBorrowInput, isValidObjectId } from './utils/validators.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.js';
import { verifyJWT } from './middleware/verifyJWT.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Universal Permissive CORS & Preflight Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

  // Respond to browser preflight OPTIONS immediately with HTTP 200
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.options('*', (req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.status(200).end();
});

// URL Prefix Alias: Automatically strips accidental /v or /api prefix
app.use((req, res, next) => {
  if (req.url.startsWith('/v/')) {
    req.url = req.url.substring(2);
  } else if (req.url === '/v') {
    req.url = '/';
  } else if (req.url.startsWith('/api/')) {
    req.url = req.url.substring(4);
  }
  next();
});

app.use(express.json());

// Initialize MongoDB pooled connection and auto-seed initial books if empty
connectDB()
  .then(async ({ booksCollection }) => {
    await checkAndSeedDatabase(booksCollection);
  })
  .catch((err) => {
    console.error('Failed to initialize MongoDB connection:', err.message);
  });

// Ensure active DB connection for all incoming requests (eliminates cold start 503s)
app.use(async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  const { booksCollection } = getCollections();
  if (!booksCollection) {
    try {
      await connectDB();
    } catch (err) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is waking up. Please retry in a few seconds.',
      });
    }
  }
  next();
});

// -------------------------------------------------------------
// Root & Healthcheck Routes
// -------------------------------------------------------------
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'active',
    server: 'BookNook Library Express API Server',
    version: '1.3.0',
    documentation: 'https://github.com/ahmed-shahriar04/b14-a8-booknook-server#readme',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (req, res) => {
  try {
    const { db } = getCollections();
    const isConnected = !!db;
    res.status(200).json({
      status: 'healthy',
      database: isConnected ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// -------------------------------------------------------------
// 1. GET /stats — Global Library Statistics (Public)
// -------------------------------------------------------------
app.get('/stats', async (req, res, next) => {
  try {
    const { booksCollection, borrowsCollection } = getCollections();
    if (!booksCollection || !borrowsCollection) {
      return res.status(503).json({ success: false, message: 'Database connecting...' });
    }

    const [totalBooks, totalBorrows, categories] = await Promise.all([
      booksCollection.countDocuments(),
      borrowsCollection.countDocuments(),
      booksCollection.distinct('category'),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBooks,
        totalBorrows,
        totalCategories: categories.length,
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// GET /authors — Get all unique authors dynamically from database (Public)
// -------------------------------------------------------------
app.get('/authors', async (req, res, next) => {
  try {
    const { booksCollection } = getCollections();
    if (!booksCollection) {
      return res.status(503).json({ success: false, message: 'Database connecting...' });
    }

    const authors = await booksCollection.distinct('author');
    const cleanAuthors = (authors || [])
      .map((a) => a?.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    res.status(200).json({ success: true, count: cleanAuthors.length, data: cleanAuthors });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 2. GET /books — Get all books (Public)
// Supports: ?category, ?search, ?userEmail, ?limit, ?sort
// -------------------------------------------------------------
app.get('/books', async (req, res, next) => {
  try {
    const { booksCollection } = getCollections();
    if (!booksCollection) {
      return res.status(503).json({ success: false, message: 'Database connecting...' });
    }

    const { limit, sort, category, search, userEmail } = req.query;
    let query = {};

    if (category && category !== 'All' && category !== 'All Categories') {
      query.category = category;
    }

    if (userEmail) {
      query.userEmail = userEmail;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    let cursor = booksCollection.find(query);

    // Sort descending by creation date (newest first)
    if (sort === 'desc' || sort === 'newest' || limit) {
      cursor = cursor.sort({ createdAt: -1 });
    }

    if (limit) {
      cursor = cursor.limit(parseInt(limit, 10));
    }

    const books = await cursor.toArray();
    res.status(200).json({ success: true, count: books.length, data: books });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 3. GET /books/:id — Get single book details (Public)
// -------------------------------------------------------------
app.get('/books/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Book ID format' });
    }

    const { booksCollection } = getCollections();
    const book = await booksCollection.findOne({ _id: new ObjectId(id) });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.status(200).json({ success: true, data: book });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 4. POST /books — Add a book (Private Route, verifyJWT)
// -------------------------------------------------------------
app.post('/books', verifyJWT, async (req, res, next) => {
  try {
    const validation = validateBookInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const { booksCollection } = getCollections();
    const userEmail = req.user.email;
    const userName = req.user.name || 'Anonymous Reader';

    const newBook = {
      ...validation.sanitized,
      userEmail,
      userName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await booksCollection.insertOne(newBook);
    res.status(201).json({
      success: true,
      message: 'Book added successfully!',
      insertedId: result.insertedId,
      data: newBook,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 5. PATCH /books/:id — Update a book (Private Route, verifyJWT)
// -------------------------------------------------------------
app.patch('/books/:id', verifyJWT, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Book ID format' });
    }

    const { booksCollection } = getCollections();
    const book = await booksCollection.findOne({ _id: new ObjectId(id) });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Verify ownership
    if (book.userEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only edit books added by you.' });
    }

    const validation = validateBookInput(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const updateDoc = {
      $set: {
        ...validation.sanitized,
        updatedAt: new Date(),
      },
    };

    const result = await booksCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 6. DELETE /books/:id — Delete a book (Private Route, verifyJWT)
// With Active Loan Protection
// -------------------------------------------------------------
app.delete('/books/:id', verifyJWT, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Book ID format' });
    }

    const { booksCollection, borrowsCollection } = getCollections();
    const book = await booksCollection.findOne({ _id: new ObjectId(id) });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Verify ownership
    if (book.userEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only delete books added by you.' });
    }

    // Protection: Prevent deleting book if currently borrowed by readers
    const activeLoans = await borrowsCollection.countDocuments({ bookId: new ObjectId(id) });
    if (activeLoans > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete this book because copies are currently borrowed by readers. Please wait until returned.',
      });
    }

    const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
    res.status(200).json({ success: true, message: 'Book deleted successfully', deletedCount: result.deletedCount });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 7. POST /borrows — Borrow a book (Private Route, verifyJWT)
// -------------------------------------------------------------
app.post('/borrows', verifyJWT, async (req, res, next) => {
  try {
    const { booksCollection, borrowsCollection } = getCollections();
    const { bookId, returnDate } = req.body;
    const userEmail = req.user.email;
    const userName = req.user.name || 'Anonymous Reader';

    if (!isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: 'A valid 24-character Book ID is required.' });
    }

    // 1. Fetch book details
    const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // 2. Check totalCopies > 0
    if (book.totalCopies <= 0) {
      return res.status(400).json({ success: false, message: 'This book is currently out of stock (Not Available).' });
    }

    // 3. Prevent double borrow: check if user already borrowed this book and hasn't returned it yet
    const existingBorrow = await borrowsCollection.findOne({
      bookId: new ObjectId(bookId),
      userEmail: userEmail,
    });

    if (existingBorrow) {
      return res.status(400).json({
        success: false,
        message: 'You have already borrowed this book. Please return it before borrowing again.',
      });
    }

    // 4. Decrease available totalCopies by 1 using atomic $inc
    await booksCollection.updateOne(
      { _id: new ObjectId(bookId) },
      { $inc: { totalCopies: -1 } }
    );

    // 5. Save record in borrows collection
    const parsedReturnDate = returnDate && !isNaN(new Date(returnDate).getTime())
      ? new Date(returnDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // Default 14 days

    const borrowRecord = {
      bookId: new ObjectId(bookId),
      bookTitle: book.title,
      bookImage: book.image,
      userEmail,
      userName,
      borrowDate: new Date(),
      returnDate: parsedReturnDate,
    };

    const result = await borrowsCollection.insertOne(borrowRecord);
    res.status(201).json({
      success: true,
      message: 'Book borrowed successfully!',
      insertedId: result.insertedId,
      data: borrowRecord,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 8. GET /borrows — Get borrows of the logged in user (Private Route, verifyJWT)
// -------------------------------------------------------------
app.get('/borrows', verifyJWT, async (req, res, next) => {
  try {
    const { borrowsCollection } = getCollections();
    const userEmail = req.user.email;
    const userBorrows = await borrowsCollection
      .find({ userEmail })
      .sort({ borrowDate: -1 })
      .toArray();

    res.status(200).json({ success: true, count: userBorrows.length, data: userBorrows });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 9. GET /borrows/check/:bookId — Check if user already borrowed a book
// -------------------------------------------------------------
app.get('/borrows/check/:bookId', verifyJWT, async (req, res, next) => {
  try {
    const { bookId } = req.params;
    if (!isValidObjectId(bookId)) {
      return res.status(400).json({ success: false, message: 'Invalid Book ID' });
    }

    const { borrowsCollection } = getCollections();
    const existing = await borrowsCollection.findOne({
      bookId: new ObjectId(bookId),
      userEmail: req.user.email,
    });

    res.status(200).json({
      success: true,
      hasBorrowed: !!existing,
      borrowRecord: existing || null,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 10. DELETE /borrows/:id — Return a book (Private Route, verifyJWT)
// -------------------------------------------------------------
app.delete('/borrows/:id', verifyJWT, async (req, res, next) => {
  try {
    const borrowId = req.params.id;
    if (!isValidObjectId(borrowId)) {
      return res.status(400).json({ success: false, message: 'Invalid Borrow ID' });
    }

    const { booksCollection, borrowsCollection } = getCollections();
    const borrowRecord = await borrowsCollection.findOne({ _id: new ObjectId(borrowId) });
    if (!borrowRecord) {
      return res.status(404).json({ success: false, message: 'Borrow record not found' });
    }

    // Verify that this borrow belongs to the logged-in user
    if (borrowRecord.userEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only return your own borrowed books.' });
    }

    // 1. Delete borrow record
    await borrowsCollection.deleteOne({ _id: new ObjectId(borrowId) });

    // 2. Increase totalCopies by 1 ($inc: +1)
    if (borrowRecord.bookId) {
      const bId = ObjectId.isValid(borrowRecord.bookId)
        ? new ObjectId(borrowRecord.bookId)
        : borrowRecord.bookId;
      await booksCollection.updateOne(
        { _id: bId },
        { $inc: { totalCopies: 1 } }
      );
    }

    res.status(200).json({ success: true, message: 'Book returned successfully!' });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// Unhandled 404 Route & Global Error Handling Middlewares
// -------------------------------------------------------------
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start Express Server
app.listen(port, () => {
  console.log(`🚀 BookNook server running on port: ${port}`);
});
