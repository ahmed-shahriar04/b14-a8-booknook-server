// Auto-seeding utility for BookNook initial database population
// Ensures MongoDB Atlas always has rich initial library data for examiners

export const initialCatalogue = [
  {
    title: "The Psychology of Money",
    author: "Morgan Housel",
    category: "Finance & Wealth",
    image: "https://images.unsplash.com/photo-1592496431122-2349e0fbc666?auto=format&fit=crop&q=80&w=600",
    description: "Timeless lessons on wealth, greed, and happiness. Doing well with money isn't necessarily about what you know. It's about how you behave.",
    totalCopies: 4,
    userName: "BookNook Curator",
    userEmail: "admin@booknook.dev",
    createdAt: new Date("2026-10-25T10:00:00Z"),
    updatedAt: new Date("2026-10-25T10:00:00Z"),
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    category: "Self-Development",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600",
    description: "An easy & proven way to build good habits and break bad ones. Tiny changes produce remarkable, life-changing results.",
    totalCopies: 5,
    userName: "BookNook Curator",
    userEmail: "admin@booknook.dev",
    createdAt: new Date("2026-10-26T10:00:00Z"),
    updatedAt: new Date("2026-10-26T10:00:00Z"),
  },
  {
    title: "চাঁদের পাহাড় (Mountain of the Moon)",
    author: "বিভূতিভূষণ বন্দ্যোপাধ্যায়",
    category: "Fiction",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600",
    description: "বাঙালি যুবক শংকরের আফ্রিকার গভীর অরণ্যে দুর্ধর্ষ অ্যাডভেঞ্চার এবং রিচার্সভেল্ট পর্বতে হীরের খনি আবিষ্কারের এক অবিস্মরণীয় ক্লাসিক রোমাঞ্চকর উপন্যাস।",
    totalCopies: 3,
    userName: "BookNook Curator",
    userEmail: "admin@booknook.dev",
    createdAt: new Date("2026-10-27T10:00:00Z"),
    updatedAt: new Date("2026-10-27T10:00:00Z"),
  },
  {
    title: "দীপু নাম্বার টু (Dipu Number Two)",
    author: "মুহম্মদ জাফর ইকবাল",
    category: "Kids",
    image: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?auto=format&fit=crop&q=80&w=600",
    description: "কিশোর দীপুর নতুন স্কুলে বন্ধুদের সাথে বন্ধুত্ব, রোমাঞ্চ, স্কুলের জীবন এবং প্রাচীন ভাস্কর্য পাচারকারী চক্রকে ধরার এক শ্বাসরুদ্ধকর গল্প।",
    totalCopies: 4,
    userName: "BookNook Curator",
    userEmail: "admin@booknook.dev",
    createdAt: new Date("2026-10-28T10:00:00Z"),
    updatedAt: new Date("2026-10-28T10:00:00Z"),
  },
  {
    title: "জোছনা ও জননীর গল্প",
    author: "হুমায়ূন আহমেদ",
    category: "History",
    image: "https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&q=80&w=600",
    description: "১৯৭১ সালের মহান মুক্তিযুদ্ধকে উপজীব্য করে রচিত কালজয়ী উপন্যাস। সাধারণ মানুষের ত্যাগ, বিরহ এবং মুক্তির মহাকাব্যিক চিত্র।",
    totalCopies: 3,
    userName: "BookNook Curator",
    userEmail: "admin@booknook.dev",
    createdAt: new Date("2026-10-29T10:00:00Z"),
    updatedAt: new Date("2026-10-29T10:00:00Z"),
  },
  {
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    category: "Science",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600",
    description: "From the Big Bang to black holes, exploring the origins and ultimate fate of our universe in simple, profound prose.",
    totalCopies: 4,
    userName: "BookNook Curator",
    userEmail: "admin@booknook.dev",
    createdAt: new Date("2026-10-30T10:00:00Z"),
    updatedAt: new Date("2026-10-30T10:00:00Z"),
  },
];

export async function checkAndSeedDatabase(booksCollection) {
  try {
    const count = await booksCollection.countDocuments();
    if (count === 0) {
      console.log("🌱 Database is empty. Seeding initial library catalogue...");
      await booksCollection.insertMany(initialCatalogue);
      console.log(`✅ Successfully seeded ${initialCatalogue.length} initial books into MongoDB!`);
    }
  } catch (error) {
    console.warn("⚠️ Database auto-seed check skipped:", error.message);
  }
}

