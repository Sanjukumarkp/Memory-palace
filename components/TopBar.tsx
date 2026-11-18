import Link from "next/link";
import { logout } from "@/app/actions";

export default function TopBar({ name, home, links = [] }: { name?: string; home: string; links?: { href: string; label: string }[] }) {
  return (
    <header className="topbar">
      <Link href={home} className="logo">
        🏰 Memory <span>Palace</span>
      </Link>
      <div className="right">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
        {name && <span className="hi">Hi, {name}</span>}
        {name && (
          <form action={logout}>
            <button className="btn ghost" style={{ padding: "0.4rem 0.8rem" }}>
              Log out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
