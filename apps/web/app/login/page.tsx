import { redirect } from "next/navigation";
import { getServerSession } from "../../lib/auth";
import { LoginForm } from "../../components/LoginForm";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem"
      }}
    >
      <LoginForm />
    </main>
  );
}
