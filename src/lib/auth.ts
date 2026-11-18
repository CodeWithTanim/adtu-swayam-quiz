import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri);

export const auth = betterAuth({
  database: client.db(process.env.MONGODB_DATABASE_NAME || "swayam-owntest"),
  secret: process.env.BETTER_AUTH_SECRET || "BbrZzoXoeDHxJZQHqqgAaL60IKYBj7ji",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
});
