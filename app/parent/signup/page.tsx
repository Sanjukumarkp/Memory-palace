import Link from "next/link";
import TopBar from "@/components/TopBar";
import { SignupForm } from "@/components/AccountForms";

export default function Page() {
  return (
    <>
      <TopBar home="/" />
      <main className="wrap narrow">
        <div className="card stack">
          <h1>Create a parent account</h1>
          <SignupForm role="PARENT" />
          <p className="small muted center">
            Already have an account? <Link href="/parent/login">Log in</Link>
          </p>
        </div>
      </main>
    </>
  );
}
