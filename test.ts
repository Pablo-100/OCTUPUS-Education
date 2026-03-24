import "dotenv/config";
import { getDb } from "./server/db";
import { users } from "./drizzle/schema";

async function run() {
  const db = await getDb();
  if (db) {
    const allUsers = await db.select().from(users);
    console.log("Users:", allUsers.length, allUsers);
  } else {
    console.log("no db");
  }
}

run().catch(console.error);
