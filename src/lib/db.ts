import mongoose from "mongoose";

const DEFAULT_URI =
  "mongodb://swayam-test:AHUomII2J2SpOU76@ac-kkmkuw6-shard-00-00.3umsmo6.mongodb.net:27017,ac-kkmkuw6-shard-00-01.3umsmo6.mongodb.net:27017,ac-kkmkuw6-shard-00-02.3umsmo6.mongodb.net:27017/?ssl=true&replicaSet=atlas-34ki4c-shard-0&authSource=admin";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI || DEFAULT_URI;

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: process.env.MONGODB_DATABASE_NAME || "swayam-owntest",
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
