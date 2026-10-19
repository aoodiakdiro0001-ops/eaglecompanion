import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "إنشاء حساب" };

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/app");
  return <AuthForm mode="register" />;
}
