# Memory Palace

Daily memory-skills practice for school kids (ages 6–16), with progress tracking for teachers and parents.

Kids practise six techniques in order: **Read & Recall → Flashcard Boxes → Memory Tricks → Story Links → Memory Palace → Memory Challenge**.

## How learning works

| Rule | Detail |
| --- | --- |
| Start | Each child takes a 15-item **Memory Test** first (baseline). |
| Daily plan | Review due cards + practise the current skill + refresh any weak skill. |
| Daily "done" | A practice task is done after one round at 80%+ or 3 rounds in a day. |
| Mastery | A skill is mastered after scoring 80%+ on **3 different days**. Then the next skill unlocks. |
| Adaptive level | 90%+ raises the level (more items); under 60% lowers it. |
| Weak areas | Missed facts go into Leitner boxes (back tomorrow → 3 days → 1 week). A mastered skill whose recent average drops below 70% is scheduled for a refresh. |
| AI | With `ANTHROPIC_API_KEY` set, Claude writes fresh age-appropriate passages, lists and flashcards, plus coach notes for teachers and parents. Without a key (or if AI fails) the app uses its built-in content. |
| Age groups | Juniors 6–8, Middles 9–12, Seniors 13–16: item counts, timing and content adapt. |

## Roles

- **Teacher**: signs up, creates classes (gets a class code), adds students (first name, age group, 4-digit PIN), sees class and child dashboards, resets PINs, can skip a child to the next skill.
- **Parent**: signs up with the child's **parent code** (shown to the teacher), sees only their own children.
- **Student**: logs in at `/kid/login` with class code → name → PIN. 5 wrong PINs lock the account for 10 minutes.

## Run locally

```bash
npm install
cp .env.example .env        # set DATABASE_URL and SESSION_SECRET
npm run db:migrate          # creates tables (safe to re-run)
npm run dev                 # http://localhost:3000
```

## Deploy (Vercel + Postgres)

1. Create a Postgres database (Neon, Supabase, Render or Vercel's Postgres marketplace add-on) and copy its connection string.
2. Run `DATABASE_URL="<connection string>" npm run db:migrate` once.
3. Import this project into Vercel and set environment variables:
   - `DATABASE_URL`: the connection string (SSL is used automatically for non-local hosts)
   - `SESSION_SECRET`: a random string of 32+ characters (`openssl rand -hex 32`)
   - `ANTHROPIC_API_KEY`: optional, turns on AI content and coach notes
   - `ANTHROPIC_MODEL`: optional, defaults to `claude-haiku-5-5`
4. Deploy.

## Project layout

```
app/            pages (teacher, parent, kid) + API routes + server actions
components/     UI: Practice (all exercises), KidReport, PalaceBuilder, forms
lib/modules.ts  the six skills and all learning rules (mastery, levels, timing)
lib/progress.ts mastery, unlocking, spaced repetition, daily plan, streaks
lib/exercises.ts generating and grading exercises (answers stay on the server)
lib/content.ts  built-in passages, lists, flashcards and word bank
lib/ai.ts       Claude content generation and coach notes
db/schema.sql   database schema
```

## Privacy

Only first names, an age group and practice results are stored for children. No child email or photo is collected. PINs and passwords are hashed.
