import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "تسجيل الدخول" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/app");
  return <AuthForm mode="login" />;
}
