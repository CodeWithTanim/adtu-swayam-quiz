import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";

const DEFAULT_URI =
  "mongodb://swayam-test:AHUomII2J2SpOU76@ac-kkmkuw6-shard-00-00.3umsmo6.mongodb.net:27017,ac-kkmkuw6-shard-00-01.3umsmo6.mongodb.net:27017,ac-kkmkuw6-shard-00-02.3umsmo6.mongodb.net:27017/?ssl=true&replicaSet=atlas-34ki4c-shard-0&authSource=admin";

const uri = process.env.MONGODB_URI || DEFAULT_URI;
const client = new MongoClient(uri);

export const auth = betterAuth({
  database: client.db(process.env.MONGODB_DATABASE_NAME || "swayam-owntest"),
  secret: process.env.BETTER_AUTH_SECRET || "BbrZzoXoeDHxJZQHqqgAaL60IKYBj7ji",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
});
