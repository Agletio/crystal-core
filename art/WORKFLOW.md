# How the two of us hand work over

**Astra has push access. Read this before assuming what reaches whom.**

## What can and cannot wake the other

**Neither of us can trigger the other on demand.** There is no channel between
a Claude Code session and a GPT project — no webhook, no shared queue, nothing
either vendor exposes to the other. A pull request does not wake Claude, and
nothing Claude pushes wakes Astra.

What each of us actually has:

| | can be woken by |
|---|---|
| **Claude** | a scheduled Routine that starts a fresh session; PR events, but only into a session already running and subscribed |
| **Astra** | whatever her side polls, if anything; otherwise the owner opening the chat |

So the working model is **symmetric polling, not mutual triggering**: each side
checks the repository when it next runs, picks up whatever is waiting, and
leaves its own result behind. It is slower than an event, and in practice it
costs nothing, because neither of us is idle-waiting on the other anyway.

## Therefore: THE REPOSITORY CARRIES THE STATE, NOT THE CHAT

This is the rule everything else follows from. Either of us must be able to
open the repo cold — new session, no memory, no context — and know exactly what
is waiting. Nothing that matters may live only in a conversation.

## The state machine is the brief's `Status:` line

Every file in `briefs/` opens with one. It is the whole protocol.

| status | means | whose move |
|---|---|---|
| `open` | Claude has asked for something | **Astra** |
| `delivered` | the art is in `deliveries/<same number>/` | **Claude** |
| `integrated` | it is in the game, and the Outcome section says what happened | nobody — done |
| `superseded by NNNN` | overtaken; read that one instead | nobody |
| `blocked: <what>` | waiting on the owner; also listed in `QUESTIONS.md` | **the owner** |

**Change the status in the same commit as the work.** A delivery whose brief
still says `open` is a delivery nobody will look for.

## Astra's side

1. Read `briefs/` for anything `open`. Highest number first.
2. Work.
3. Commit to `deliveries/NNNN-slug/` on `main` — the art, plus `NOTES.md`
   (`deliveries/README.md` has the shape).
4. In the same commit, set that brief's status to `delivered`.

A pull request instead of a direct commit is welcome and changes nothing about
the protocol — it just gives the owner a review gate. Say which you did in
`NOTES.md`.

## Claude's side

1. Read `briefs/` for anything `delivered`.
2. Measure it — `gridcheck`, `styleread`, `feetread`, and the floor at ship
   size. Never take a claim on trust, including a well-evidenced one; Astra has
   been right against my own numbers twice, and I have been wrong twice.
3. Write the result into that brief's **Outcome** section: what landed, what the
   numbers said, what is still off. That section is the record — not this chat.
4. Set the status to `integrated`, or write the next brief if there is a next
   round.

## What each of us must never do

Both directions of the contract, restated because this is where they bite:

- **Claude does not make art.** A picture the game needs is a brief.
- **Astra does not change gameplay, architecture, APIs or the renderer seam.**
  Anything needed there goes in `NOTES.md` and Claude does it.
- **Neither of us edits the other's outcome.** Astra writes `NOTES.md`; Claude
  writes the brief's Outcome. Disagreements go in the next round's text, not by
  overwriting.

## What the owner still does

- Everything in `QUESTIONS.md`. Direction is his, not ours.
- Approving a design before expensive work.
- Deciding when a round is good enough to ship.

He should not have to carry files, relay numbers, or remember whose turn it is.
If he is doing any of those, the repository is not carrying enough state and
that is a fault to fix here.
