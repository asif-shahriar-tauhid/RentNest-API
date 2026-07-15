import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = `${process.env.database_url}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
