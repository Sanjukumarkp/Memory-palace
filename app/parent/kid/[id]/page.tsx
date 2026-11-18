import { notFound } from "next/navigation";
import TopBar from "@/components/TopBar";
import KidReport from "@/components/KidReport";
import { requireParent } from "@/lib/auth";
import { canViewKid } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function ParentKidPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await requireParent();
  const { id } = await params;
  const kid = await canViewKid(p, id);
  if (!kid) notFound();
  return (
    <>
      <TopBar home="/parent" name={p.name} links={[{ href: "/parent", label: "← My children" }]} />
      <main className="wrap">
        <KidReport kid={kid} />
      </main>
    </>
  );
}
