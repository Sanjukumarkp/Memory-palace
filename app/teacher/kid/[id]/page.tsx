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
      <main className="wrap stack">
        <KidReport kid={kid} />
        <section className="card">
          <h2>Teacher tools</h2>
          <p className="muted small">
            Parent code: <span className="code">{kid.parent_code}</span> (parents use it to sign up and see this report)
          </p>
          <div className="grid grid-3" style={{ alignItems: "start" }}>
            <Form action={resetPin.bind(null, kid.id)} submit="Set new PIN">
              <div className="field">
                <label htmlFor="pin">New 4-digit PIN</label>
                <input id="pin" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} required />
              </div>
            </Form>
            <form action={unlockNextModule.bind(null, kid.id)} className="stack">
              <p className="small muted" style={{ margin: 0 }}>
                Mark the current skill as mastered and unlock the next one (e.g. if the child already learned it in class).
              </p>
              <button className="btn secondary block">Skip to next skill</button>
            </form>
            <form action={removeKid.bind(null, kid.id, kid.classroom_id)} className="stack">
              <p className="small muted" style={{ margin: 0 }}>
                Remove this student and delete all their practice data. This can't be undone.
              </p>
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
