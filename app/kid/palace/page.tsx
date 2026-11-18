import TopBar from "@/components/TopBar";
import PalaceBuilder from "@/components/PalaceBuilder";
import { requireKid } from "@/lib/auth";
import { sql } from "@/lib/db";
import { palaceSpotCount, type AgeBand } from "@/lib/modules";
import { PALACE_SPOT_SUGGESTIONS } from "@/lib/content";

export default async function PalacePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const k = await requireKid();
  const [kid] = await sql<{ palace_spots: string[]; age_band: AgeBand }[]>`SELECT palace_spots, age_band FROM kids WHERE id = ${k.kidId}`;
  const next = (await searchParams).next === "5";
  return (
    <>
      <TopBar home="/kid" name={k.name} links={[{ href: "/kid", label: "← My plan" }]} />
      <main className="wrap practice">
        <PalaceBuilder
          initial={kid.palace_spots}
          count={palaceSpotCount(kid.age_band)}
          suggestions={PALACE_SPOT_SUGGESTIONS}
          nextHref={next ? "/kid/practice/5" : "/kid"}
        />
      </main>
    </>
  );
}
