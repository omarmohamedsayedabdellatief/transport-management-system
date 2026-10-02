import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
const input = z
  .object({
    ADMIN_EMAIL: z.string().email(),
    ADMIN_PASSWORD: z.string().min(12).max(128),
    ADMIN_NAME: z.string().min(2).default("Administrator"),
  })
  .parse(process.env);
const db = new PrismaClient();
try {
  const email = input.ADMIN_EMAIL.toLowerCase().trim();
  if (await db.user.findUnique({ where: { email } }))
    throw new Error(
      "An account with this email already exists. No changes made.",
    );
  await db.user.create({
    data: {
      email,
      fullName: input.ADMIN_NAME,
      passwordHash: await bcrypt.hash(input.ADMIN_PASSWORD, 12),
      role: "ADMIN",
    },
  });
  console.log("Administrator created. Sign in with the supplied credentials.");
} finally {
  await db.$disconnect();
}
