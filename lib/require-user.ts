import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";
import type { User } from "@/types";

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
