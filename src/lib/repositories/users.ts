import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type CreateUserInput = {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export async function createUser(input: CreateUserInput) {
  return db.users.create({
    data: {
      email: input.email,
      username: input.username,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
    },
  });
}

export async function getUserByEmail(email: string) {
  return db.users.findUnique({ where: { email } });
}

export async function listUsers(args?: Prisma.usersFindManyArgs) {
  return db.users.findMany(args);
}
