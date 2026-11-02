import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn("⚠️ Warning: MONGODB_URI is not set in environment variables.");
}

export const client = new MongoClient(uri || '', {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  minPoolSize: 1,
  connectTimeoutMS: 10000,
});

let db = null;
let booksCollection = null;
let borrowsCollection = null;
let isConnecting = false;

export async function connectDB() {
  if (db && booksCollection && borrowsCollection) {
    return { db, booksCollection, borrowsCollection };
  }

  if (isConnecting) {
    // Wait briefly if connection is already in-flight
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (db && booksCollection) return { db, booksCollection, borrowsCollection };
  }

  isConnecting = true;
  try {
    await client.connect();
    db = client.db('booknook');
    booksCollection = db.collection('books');
    borrowsCollection = db.collection('borrows');
    console.log("✅ Successfully connected to MongoDB Atlas (booknook database)");
    return { db, booksCollection, borrowsCollection };
  } catch (error) {
    console.error("❌ MongoDB Atlas connection failure:", error.message);
    throw error;
  } finally {
    isConnecting = false;
  }
}

export function getCollections() {
  return { db, booksCollection, borrowsCollection };
}

