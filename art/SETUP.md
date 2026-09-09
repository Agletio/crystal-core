# Setting Astra up

## Current connected setup

GitHub read and write access has been verified. The hourly ChatGPT art
handoff check is paused; the owner wants event-triggered ready-work handoffs. Follow [AUTOMATION.md](AUTOMATION.md) to create the
Claude **Cloud** routine and verify the first complete exchange. That file
carries the current setup status and the exact routine prompt.

The repository is now the primary context source. Read current numbered briefs;
the first brief mentioned below is historical. Manual uploads and owner-carried
deliveries below are fallback instructions, not the configured handoff.

## Original manual onboarding reference

For setting up a fresh project without repository access.

## 1. Make her a project, not a chat

In the GPT app, create a **Project** (or whatever the equivalent workspace is)
called **Crystal Core — Art**. A project keeps instructions and files across
conversations; a plain chat forgets both, and re-explaining this game every
session is the thing that will kill the arrangement.

## 2. Give her the role

Paste the whole of `art/ASTRA.md` into the project's **instructions** field.

If the field is too small for it, paste this instead and upload `ASTRA.md` as
a file:

> You are Astra, Art Director and Art Pipeline Engineer for Crystal Core, a
> browser ARPG in pixel art. You work with Claude, the lead engineer, and with
> the game's owner, who has final say on everything visual. You own visual
> style, assets, palettes, animation, art consistency and art tooling. You do
> not own gameplay logic, architecture, APIs, schemas, mechanics or UI
> functionality — anything you need there, you ask Claude for in writing.
> Read the uploaded ASTRA.md and PIPELINE.md before drawing anything: this
> game ships no image files, and art that does not fit the table shapes cannot
> be loaded. Show the owner a design before doing expensive work. Any claim
> about art needs a picture, on the real game floor, at the size it is seen.

## 3. Give her the context

Run:

```
node tools/astra-pack.mjs
```

It writes **`art/astra-pack.md`** — the whole desk in one file — and prints
the pictures to attach beside it. Upload both to the project's files.

Re-run it and re-upload whenever the desk changes. It is cheap and it is the
only thing keeping her copy honest.

## 4. Decide how art comes back

Pick one. Both work; the first is less work per job.

**A — she gets the repo.** Give the project access to the GitHub repo and a
branch of her own. She commits deliveries to `art/deliveries/NNNN-slug/`,
tells you, and you tell Claude to pull and integrate. Best if her tooling can
push.

**B — you carry the files.** She hands you PNGs and a `NOTES.md`; you drop
them into a message to Claude, or into `art/deliveries/NNNN-slug/` yourself.
Slower, but it needs no setup at all and it is how to start today.

Either way the shape is the same, which is the point of the folder.

## 5. The first exchange

Say to Astra:

> Here is the art handoff pack for Crystal Core. Read PIPELINE.md carefully —
> the shipping format is unusual. Brief 0001 is open and its picture is
> attached. Tell me what you want to look at before you decide anything.

She will ask for screenshots. Ask Claude for them by name — any screen, any
body, any floor — and Claude will shoot them.

## What to watch for early

- **If she starts changing game code**, that is the contract slipping. She may
  touch art tooling and nothing else.
- **If Claude starts making art**, same thing in the other direction. Claude
  should be filing briefs.
- **If she designs without a picture of where it goes**, ask Claude for the
  screenshot first. Every expensive art mistake in this project so far was
  judged on white and looked wrong on the floor.
