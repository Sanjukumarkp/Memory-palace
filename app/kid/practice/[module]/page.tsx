import { notFound } from "next/navigation";
import TopBar from "@/components/TopBar";
import Practice from "@/components/Practice";
import { requireKid } from "@/lib/auth";

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ baseline?: string }>;
}) {
  const k = await requireKid();
  const module = Number((await params).module);
  if (!(module >= 1 && module <= 6)) notFound();
  const baseline = (await searchParams).baseline === "1" && module === 6;
  return (
    <>
      <TopBar home="/kid" name={k.name} links={[{ href: "/kid", label: "← My plan" }]} />
      <main className="wrap practice">
        <Practice module={module} mode={baseline ? "baseline" : undefined} />
      </main>
    </>
  );
}
