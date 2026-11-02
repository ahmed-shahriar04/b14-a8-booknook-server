import { ObjectId } from 'mongodb';

/**
 * Validates whether a given string is a valid MongoDB ObjectId
 */
export function isValidObjectId(id) {
  if (!id || typeof id !== 'string') return false;
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

/**
 * Validates and sanitizes book payload for creation and updates
 */
export function validateBookInput(data, isUpdate = false) {
  const { title, author, category, image, description, totalCopies } = data;

  if (!isUpdate) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      return { isValid: false, error: 'Book title is required and must be non-empty.' };
    }
    if (!author || typeof author !== 'string' || !author.trim()) {
      return { isValid: false, error: 'Author name is required and must be non-empty.' };
    }
    if (!category || typeof category !== 'string' || !category.trim()) {
      return { isValid: false, error: 'Category is required and must be non-empty.' };
    }
    if (!image || typeof image !== 'string' || !image.trim()) {
      return { isValid: false, error: 'Cover image URL is required.' };
    }
    if (totalCopies === undefined || totalCopies === null || isNaN(Number(totalCopies)) || Number(totalCopies) < 0) {
      return { isValid: false, error: 'Total copies must be a non-negative number.' };
    }
  } else {
    // If update, validate only supplied fields
    if (title !== undefined && (!title || typeof title !== 'string' || !title.trim())) {
      return { isValid: false, error: 'Title cannot be empty.' };
    }
    if (author !== undefined && (!author || typeof author !== 'string' || !author.trim())) {
      return { isValid: false, error: 'Author cannot be empty.' };
    }
    if (totalCopies !== undefined && (isNaN(Number(totalCopies)) || Number(totalCopies) < 0)) {
      return { isValid: false, error: 'Total copies must be a non-negative number.' };
    }
  }

  const sanitized = {};
  if (title !== undefined) sanitized.title = String(title).trim();
  if (author !== undefined) sanitized.author = String(author).trim();
  if (category !== undefined) sanitized.category = String(category).trim();
  if (image !== undefined) sanitized.image = String(image).trim();
  if (description !== undefined) sanitized.description = String(description).trim();
  if (totalCopies !== undefined) sanitized.totalCopies = parseInt(totalCopies, 10);

  return { isValid: true, sanitized };
}

/**
 * Validates borrow request payload
 */
export function validateBorrowInput(data) {
  const { bookId, userEmail, returnDate } = data;

  if (!bookId || !isValidObjectId(bookId)) {
    return { isValid: false, error: 'A valid 24-character bookId is required.' };
  }

  if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
    return { isValid: false, error: 'A valid borrower userEmail is required.' };
  }

  if (!returnDate || isNaN(new Date(returnDate).getTime())) {
    return { isValid: false, error: 'A valid returnDate (YYYY-MM-DD) is required.' };
  }

  return {
    isValid: true,
    sanitized: {
      bookId: String(bookId).trim(),
      userEmail: String(userEmail).trim().toLowerCase(),
      returnDate: new Date(returnDate).toISOString(),
    },
  };
}

