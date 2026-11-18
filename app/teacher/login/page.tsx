import Link from "next/link";
import TopBar from "@/components/TopBar";
import { LoginForm } from "@/components/AccountForms";

export default function Page() {
  return (
    <>
      <TopBar home="/" />
      <main className="wrap narrow">
        <div className="card stack">
          <h1>Teacher login</h1>
          <LoginForm role="TEACHER" />
          <p className="small muted center">
            New here? <Link href="/teacher/signup">Create a teacher account</Link>
          </p>
        </div>
      </main>
    </>
  );
}
