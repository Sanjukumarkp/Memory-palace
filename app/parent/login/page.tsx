import Link from "next/link";
import TopBar from "@/components/TopBar";
import { LoginForm } from "@/components/AccountForms";

export default function Page() {
  return (
    <>
      <TopBar home="/" />
      <main className="wrap narrow">
        <div className="card stack">
          <h1>Parent login</h1>
          <LoginForm role="PARENT" />
          <p className="small muted center">
            New here? <Link href="/parent/signup">Create a parent account</Link>
          </p>
        </div>
      </main>
    </>
  );
}
