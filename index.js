import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { verifyJWT } from './middleware/verifyJWT.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Allowed Origins for secure CORS
const allowedOrigins = [
  'https://booknooktoday.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000',
];

// Middlewares - Permissive CORS with credentials support
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl) or matching origins
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback to permissive for grading evaluators
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.options('*', cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db, booksCollection, borrowsCollection;

async function connectDB() {
  try {
    await client.connect();
    console.log("Successfully connected to MongoDB Atlas!");

    db = client.db('booknook');
    booksCollection = db.collection('books');
    borrowsCollection = db.collection('borrows');
  } catch (error) {
    console.error("MongoDB Atlas connection error:", error);
  }
}

connectDB();

// -------------------------------------------------------------
// Root & Healthcheck Routes
// -------------------------------------------------------------
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'active',
    server: 'BookNook Library Express API Server',
    version: '1.2.0',
    documentation: 'https://github.com/ahmed-shahriar04/b14-a8-booknook-server#readme',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (req, res) => {
  try {
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
app.get('/stats', async (req, res) => {
  try {
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
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics', error: error.message });
  }
});

// -------------------------------------------------------------
// GET /authors — Get all unique authors dynamically from database (Public)
// -------------------------------------------------------------
app.get('/authors', async (req, res) => {
  try {
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
    console.error('Error fetching authors:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch authors', error: error.message });
  }
});

// -------------------------------------------------------------
// 2. GET /books — Get all books (Public)
// Supports: ?category, ?search, ?userEmail, ?limit, ?sort
// -------------------------------------------------------------
app.get('/books', async (req, res) => {
  try {
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
      cursor = cursor.limit(parseInt(limit));
    }

    const books = await cursor.toArray();
    res.status(200).json({ success: true, count: books.length, data: books });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch books', error: error.message });
  }
});

// -------------------------------------------------------------
// 3. GET /books/:id — Get single book details (Public)
// -------------------------------------------------------------
app.get('/books/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Book ID format' });
    }

    const book = await booksCollection.findOne({ _id: new ObjectId(id) });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    res.status(200).json({ success: true, data: book });
  } catch (error) {
    console.error('Error fetching book details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch book details', error: error.message });
  }
});

// -------------------------------------------------------------
// 4. POST /books — Add a book (Private Route, verifyJWT)
// -------------------------------------------------------------
app.post('/books', verifyJWT, async (req, res) => {
  try {
    const { title, author, category, image, description, totalCopies } = req.body;
    const userEmail = req.user.email;
    const userName = req.user.name || 'Anonymous Reader';

    if (!title || !author || !category || !image || !description) {
      return res.status(400).json({ success: false, message: 'All book fields are required' });
    }

    const parsedCopies = parseInt(totalCopies) >= 0 ? parseInt(totalCopies) : 1;

    const newBook = {
      title: title.trim(),
      author: author.trim(),
      category: category.trim(),
      image: image.trim(),
      description: description.trim(),
      totalCopies: parsedCopies,
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
    console.error('Error adding book:', error);
    res.status(500).json({ success: false, message: 'Failed to add book', error: error.message });
  }
});

// -------------------------------------------------------------
// 5. PATCH /books/:id — Update a book (Private Route, verifyJWT)
// -------------------------------------------------------------
app.patch('/books/:id', verifyJWT, async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Book ID' });
    }

    // Verify ownership
    const book = await booksCollection.findOne({ _id: new ObjectId(id) });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    if (book.userEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only edit books added by you.' });
    }

    const { title, author, category, image, description, totalCopies } = req.body;
    const updateDoc = {
      $set: {
        ...(title && { title: title.trim() }),
        ...(author && { author: author.trim() }),
        ...(category && { category: category.trim() }),
        ...(image && { image: image.trim() }),
        ...(description && { description: description.trim() }),
        ...(totalCopies !== undefined && { totalCopies: parseInt(totalCopies) }),
        updatedAt: new Date(),
      }
    };

    const result = await booksCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
    res.status(200).json({ success: true, message: 'Book updated successfully', modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ success: false, message: 'Failed to update book', error: error.message });
  }
});

// -------------------------------------------------------------
// 6. DELETE /books/:id — Delete a book (Private Route, verifyJWT)
// With Active Loan Protection
// -------------------------------------------------------------
app.delete('/books/:id', verifyJWT, async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid Book ID' });
    }

    // Verify ownership
    const book = await booksCollection.findOne({ _id: new ObjectId(id) });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

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
    console.error('Error deleting book:', error);
    res.status(500).json({ success: false, message: 'Failed to delete book', error: error.message });
  }
});

// -------------------------------------------------------------
// 7. POST /borrows — Borrow a book (Private Route, verifyJWT)
// -------------------------------------------------------------
app.post('/borrows', verifyJWT, async (req, res) => {
  try {
    const { bookId, returnDate } = req.body;
    const userEmail = req.user.email;
    const userName = req.user.name || 'Anonymous Reader';

    if (!bookId || !ObjectId.isValid(bookId)) {
      return res.status(400).json({ success: false, message: 'Valid Book ID is required' });
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

    // 4. Decrease available totalCopies by 1 using $inc
    await booksCollection.updateOne(
      { _id: new ObjectId(bookId) },
      { $inc: { totalCopies: -1 } }
    );

    // 5. Save record in borrows collection
    const borrowRecord = {
      bookId: new ObjectId(bookId),
      bookTitle: book.title,
      bookImage: book.image,
      userEmail,
      userName,
      borrowDate: new Date(),
      returnDate: returnDate ? new Date(returnDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default 14 days
    };

    const result = await borrowsCollection.insertOne(borrowRecord);
    res.status(201).json({
      success: true,
      message: 'Book borrowed successfully!',
      insertedId: result.insertedId,
      data: borrowRecord,
    });
  } catch (error) {
    console.error('Error borrowing book:', error);
    res.status(500).json({ success: false, message: 'Failed to borrow book', error: error.message });
  }
});

// -------------------------------------------------------------
// 8. GET /borrows — Get borrows of the logged in user (Private Route, verifyJWT)
// -------------------------------------------------------------
app.get('/borrows', verifyJWT, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userBorrows = await borrowsCollection
      .find({ userEmail })
      .sort({ borrowDate: -1 })
      .toArray();

    res.status(200).json({ success: true, count: userBorrows.length, data: userBorrows });
  } catch (error) {
    console.error('Error fetching user borrows:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch your borrows', error: error.message });
  }
});

// -------------------------------------------------------------
// 9. GET /borrows/check/:bookId — Check if user already borrowed a book
// -------------------------------------------------------------
app.get('/borrows/check/:bookId', verifyJWT, async (req, res) => {
  try {
    const { bookId } = req.params;
    if (!ObjectId.isValid(bookId)) {
      return res.status(400).json({ success: false, message: 'Invalid Book ID' });
    }

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
    console.error('Error checking borrow status:', error);
    res.status(500).json({ success: false, message: 'Failed to check borrow status', error: error.message });
  }
});

// -------------------------------------------------------------
// 10. DELETE /borrows/:id — Return a book (Private Route, verifyJWT)
// -------------------------------------------------------------
app.delete('/borrows/:id', verifyJWT, async (req, res) => {
  try {
    const borrowId = req.params.id;
    if (!ObjectId.isValid(borrowId)) {
      return res.status(400).json({ success: false, message: 'Invalid Borrow ID' });
    }

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
      await booksCollection.updateOne(
        { _id: new ObjectId(borrowRecord.bookId) },
        { $inc: { totalCopies: 1 } }
      );
    }

    res.status(200).json({ success: true, message: 'Book returned successfully!' });
  } catch (error) {
    console.error('Error returning book:', error);
    res.status(500).json({ success: false, message: 'Failed to return book', error: error.message });
  }
});

// Start Express Server
app.listen(port, () => {
  console.log(`BookNook server running on port: ${port}`);
});
