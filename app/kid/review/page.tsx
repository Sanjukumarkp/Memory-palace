import TopBar from "@/components/TopBar";
import Practice from "@/components/Practice";
import { requireKid } from "@/lib/auth";

export default async function ReviewPage() {
  const k = await requireKid();
  return (
    <>
      <TopBar home="/kid" name={k.name} links={[{ href: "/kid", label: "← My plan" }]} />
      <main className="wrap practice">
        <Practice module={2} mode="review" />
      </main>
    </>
  );
}
