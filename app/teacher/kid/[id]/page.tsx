import { notFound } from "next/navigation";
import TopBar from "@/components/TopBar";
import Form from "@/components/Form";
import KidReport from "@/components/KidReport";
import ConfirmButton from "@/components/ConfirmButton";
import { requireTeacher } from "@/lib/auth";
import { canViewKid } from "@/lib/access";
import { removeKid, resetPin, unlockNextModule } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function TeacherKidPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await requireTeacher();
  const { id } = await params;
  const kid = await canViewKid(t, id);
  if (!kid) notFound();

  return (
    <>
      <TopBar home="/teacher" name={t.name} links={[{ href: `/teacher/class/${kid.classroom_id}`, label: `← ${kid.class_name}` }]} />
      <main className="wrap stack-lg">
        <KidReport kid={kid} />
        <section className="card">
          <div className="section-title">
            <h2>Teacher tools</h2>
            <p>
              Parent code: <span className="code">{kid.parent_code}</span>
            </p>
          </div>
          <p className="muted small" style={{ marginBottom: "1.25rem" }}>
            Share the parent code with the family. They use it to sign up and see this report.
          </p>
          <div className="grid grid-3" style={{ alignItems: "start", gap: "1.5rem" }}>
            <div className="stack-sm">
              <h3>Reset PIN</h3>
              <Form action={resetPin.bind(null, kid.id)} submit="Set new PIN">
                <input aria-label="New 4-digit PIN" placeholder="New 4-digit PIN" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} required />
              </Form>
            </div>
            <form action={unlockNextModule.bind(null, kid.id)} className="stack-sm">
              <h3>Skip a skill</h3>
              <p className="small muted">Marks the current skill as mastered and unlocks the next, e.g. if it was already learned in class.</p>
              <button className="btn secondary block">Skip to next skill</button>
            </form>
            <form action={removeKid.bind(null, kid.id, kid.classroom_id)} className="stack-sm">
              <h3>Remove student</h3>
              <p className="small muted">Deletes this student and all their practice data. This can't be undone.</p>
              <ConfirmButton message={`Remove ${kid.name} and delete all their practice data?`} className="btn ghost block" style={{ color: "var(--warn)" }}>
                Remove student
              </ConfirmButton>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}
