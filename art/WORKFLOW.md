# How the two of us hand work over

**Astra has push access. Read this before assuming what reaches whom.**

## What can and cannot wake the other

**The mechanism is a GitHub PR event.** Astra's event subscription has been
created and read back as enabled without a schedule. Claude's routine exists
and is enabled, but its GitHub trigger remains unverified. Neither direction
has yet passed a real event test. See `AUTOMATION.md` for evidence and exact
filters; `ROUTINE.md` contains Claude's prompt.

| side | wake-up | state |
|---|---|---|
| **Claude** | delivery PR opened from an `astra/` branch | routine enabled; event delivery unverified |
| **Astra** | Agletio opens or marks ready an `ASTRA READY: NNNN-slug` PR | subscription created and enabled; first event pending; no polling |

### The two event signals, one per direction

| direction | signal | who configures it |
|---|---|---|
| **Astra → Claude** | a PR from a head branch **starting `astra/`** | the owner; event test pending — see `ROUTINE.md` |
| **Claude → Astra** | a PR **titled `ASTRA READY: NNNN-slug`** | Astra, **created and enabled; first event pending** |

A branch prefix one way and a title prefix the other, deliberately: Claude's
routine reads branches with git and never needs the title, where a title is
what Astra's side can filter on without cloning anything.

**Astra names her branches `astra/NNNN-slug`.** The filter is what stops the
routine firing on every pull request in the repository, Claude's own included,
and burning a run each time.

**A commit alone wakes nothing**, and neither does creating a file that
describes a routine. Until a real delivery has been picked up and integrated
end to end, only repository access is established — nothing about the loop is
proven.

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

1. Read the triggering request PR at its actual head SHA and take its brief.
   Outside event runs, use the highest-numbered actionable open brief. The
   owner dropped 0006; the current request is 0007 Rimespike.
2. Work.
3. Commit to `deliveries/NNNN-slug/` — the art, plus `NOTES.md`
   (`deliveries/README.md` has the shape).
4. In the same commit, set that brief's status to `delivered`.
5. **Open a pull request from a branch named `astra/NNNN-slug`.** The branch
   name is what wakes Claude; a direct commit to `main` does not.

## Claude's side

0. **A new brief is published as a pull request titled
   `ASTRA READY: NNNN-slug`.** That title is Astra's event filter, so it is
   exact — the prefix in capitals, one space after the colon, then the brief's
   number and slug. Nothing else in the repository uses that prefix.
1. Read the delivery PR's own branch for its `delivered` brief and assets.
   Prefer the triggering PR's branch; never assume the newest branch is the
   event's work or that unmerged assets are on main.
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
