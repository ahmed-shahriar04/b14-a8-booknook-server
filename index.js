import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { verifyJWT } from './middleware/verifyJWT.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:3000', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect client to server
    await client.connect();
    console.log("Successfully connected to MongoDB Atlas!");

    const db = client.db('booknook');
    const booksCollection = db.collection('books');
    const borrowsCollection = db.collection('borrows');

    // -------------------------------------------------------------
    // 1. GET /books — Get all books (public)
    // Supports query params: ?limit=6 for home page new arrivals, ?sort=desc
    // -------------------------------------------------------------
    app.get('/books', async (req, res) => {
      try {
        const { limit, sort, category, search } = req.query;
        let query = {};

        if (category && category !== 'All' && category !== 'All Categories') {
          query.category = category;
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
    // 2. GET /books/:id — Get one book (public or details view)
    // -------------------------------------------------------------
    app.get('/books/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ success: false, message: 'Invalid Book ID' });
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
    // 3. POST /books — Add a book (Private Route, verifyJWT)
    // -------------------------------------------------------------
    app.post('/books', verifyJWT, async (req, res) => {
      try {
        const { title, author, category, image, description, totalCopies } = req.body;
        const userEmail = req.user.email;
        const userName = req.user.name || 'Anonymous Reader';

        if (!title || !author || !category || !image || !description) {
          return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const parsedCopies = parseInt(totalCopies) >= 0 ? parseInt(totalCopies) : 1;

        const newBook = {
          title,
          author,
          category,
          image,
          description,
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
    // 4. PATCH /books/:id — Update a book (Private Route, verifyJWT)
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
            ...(title && { title }),
            ...(author && { author }),
            ...(category && { category }),
            ...(image && { image }),
            ...(description && { description }),
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
    // 5. DELETE /books/:id — Delete a book (Private Route, verifyJWT)
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

        const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
        res.status(200).json({ success: true, message: 'Book deleted successfully', deletedCount: result.deletedCount });
      } catch (error) {
        console.error('Error deleting book:', error);
        res.status(500).json({ success: false, message: 'Failed to delete book', error: error.message });
      }
    });

    // -------------------------------------------------------------
    // 6. POST /borrows — Borrow a book (Private Route, verifyJWT)
    // Requirements:
    // - Check double borrow: prevent borrowing same book twice simultaneously
    // - Check totalCopies > 0
    // - $inc totalCopies: -1
    // - Save in borrows collection
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
    // 7. GET /borrows — Get borrows of the logged in user (Private Route, verifyJWT)
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
    // 8. DELETE /borrows/:id — Return a book (Private Route, verifyJWT)
    // Requirements:
    // - Remove borrow record
    // - Increase totalCopies by +1 using $inc on booksCollection
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

  } finally {
    // Keep connection alive for incoming requests
  }
}

run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send({ status: 'active', message: 'BookNook Library API Server is running smoothly.' });
});

app.listen(port, () => {
  console.log(`BookNook server running on port: ${port}`);
});

