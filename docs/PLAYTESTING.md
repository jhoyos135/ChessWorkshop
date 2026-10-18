# Playtesting record and user acceptance

## Observed user feedback · October 17, 2026

The user played the local application and requested a more physical board and pieces, direct piece dragging, smooth animations, optional legal destinations on selection, persistent best-move display, and clearer guidance about which piece to select and where it should go. Further play feedback reported disappearing recommendation labels after clicking, hard-to-understand lessons, and missing correct-answer/lesson-completion confirmation.

The implementation now includes sculpted 3D pieces and a thick wooden board; pointer-following drag with legal drop validation and smooth return; optional destination dots/rings; a saved best-move toggle; automatic source selection and destination highlighting; persistent markers naming the piece and its destination; a route banner explaining the next click; and one primary recommendation with expandable alternatives. The guidance can preview an alternative without committing it. Regression evidence is in `tests/browser/drag.spec.ts`, `best-moves.spec.ts`, and `cancellation.spec.ts`, with screenshots under `docs/evidence/`.

Lessons now use short Learn/Watch/Try stages, original movement diagrams, an autoplay/pause/step demonstration, one explicit task, visible exercise counts, and prominent correct/retry feedback. Completion automatically appears after every required exercise, with saved progress and next-lesson navigation. Most lessons have three exercises; the guided-game lesson now has a fourth exercise that reaches checkmate from the starting position. Official product-pattern research and its limits are recorded in [UX-RESEARCH.md](UX-RESEARCH.md).

Eight paired seeded policy games (both colors, four openings) originally provided reproducible legal-play, reload, determinism, and timing evidence, retained in `docs/evidence/teaching-games-v1.json` and `.pgn`. They contain 598 plies and eight Beginner wins against First steps, with no move-limit outcomes. This is an automated policy regression, not evidence of human difficulty or learning outcomes.

The user clarified that Across the table should have separate White and Black best-move toggles, and requested a camera lock to prevent accidental board movement while dragging. Both are implemented as saved session choices and covered by Chrome reload/interaction checks. This is recorded interface feedback, not a beginner calibration result.

This feedback is real user feedback about interaction. The user's chess experience and the two teaching policies' suitability for beginners have not been established. It is not presented as a completed beginner calibration study.

Further feedback requested camera lock to stay within its game, a persistent Explain toggle, reasons explaining why a recommendation helps, and a blue interface in place of green. The Home preview is now isolated from the saved game camera; Explain saves each side's choice and refreshes on future turns; explanations combine verified board facts, a legal calculated reply, and provisional search estimates. The interface uses navy navigation, blue actions, cool backgrounds, and blue flat-board squares. These are requested interaction changes, not evidence that the teaching policies are calibrated.

When asked about chess experience and difficulty observations for both colors, the user replied “is fine for now.” Those settings were retained at that point; the October 18 feedback below supersedes that decision. No detailed trial outcomes or chess-experience information were supplied, so this records acceptance of the present settings rather than a completed beginner calibration study.

The current implementation evidence and outstanding checks are recorded in [COMPLETION-AUDIT.md](COMPLETION-AUDIT.md).

## Original formal playtesting protocol (retained for reference)

1. Have an actual beginner complete the board/movement module, play both colors against First steps and Beginner, and retry a game-review moment. Note instructions they misunderstand, whether they can identify source/destination, and where help is needed.
2. Export the test sessions as JSON or PGN and record the level, policy version, seed, assistance, color, and observed difficulty. Use several reproducible games and more than one starting seed; do not infer a human rating from a short trial.
3. Adjust the error probabilities only in response to recorded observations and repeat the same seeded cases. Check legal play and the time budgets after any policy change. Keep coaching at independent full strength.
4. A human instructional reviewer should check all lesson wording, objectives, demonstrated continuations, accepted alternatives, feedback, and overlay readability. Automated legal replay proves legality and supported predicates; it does not establish that a lesson teaches its intended idea clearly.

No novice outcomes, measured ratings, or completed human instructional review have been invented. The original protocol is retained here for reference; current user acceptance and tuning are recorded below.

## Further user feedback · October 18, 2026

The user reported that locked-camera drags returned pieces to their starting square, questioned the current recommendation's accuracy, and asked for piece names instead of the generic source label. Both-color perspective fixtures reproduced a drop where the piece base was on a legal square but the raw ray selected a square behind it. A shared drop-target resolver and explicit drop marker correct that discrepancy while preserving direct cursor drops and captures.

A deterministic UCI case also reproduced a completed older iteration disagreeing with the engine's final bestmove. The display follows that final choice and keeps alternatives coherent. The earlier release refined automatic recommendations while the position stayed unchanged; the later best-move update removed that silent change. Actual WASM tests check both-color mates and checking knight forks, current-position keys and cancellation after a move. Source overlays name the piece in both board views. These checks are implementation evidence and do not replace human learning or instructional review.


## Lesson acceptance and Beginner tuning · October 18, 2026

The user said, “lessons are ok for now, but beginner seems to hard.” The lessons are accepted for this iteration; a separate formal human instructional review is no longer a blocker. This is user acceptance, not a claim that every authored branch underwent human review.

The old Beginner examined every immediate reply and chose from near-best moves on 88% of turns. Policy `teaching-2` now chooses a quiet turn with probability 55%; First steps uses 75%. On quiet turns it can overlook captures or threats and does not calculate the opponent reply. It samples legal quiet moves with a simple material/development/safety score, avoiding obvious heavy-piece giveaways where a safer quiet move exists. Other Beginner turns retain one-reply evaluation. Available checkmates are completed at either level. These probabilities describe policy branches, not measured human error rates.

`beginner-tuning.json` records 64 spread seeds for each level and color: Beginner passed up the free-rook capture 32 times per color; First steps 47. Every decision replayed legally and identically from its seed. Eight complete paired games produced 818 legal plies, six Beginner wins and two First steps wins, with eight exact midpoint restores and no move-limit outcomes. Maximum calculation time was 425.2 ms for Beginner and 33.2 ms for First steps, within 500/250 ms budgets. Previous reports are preserved as teaching-games-v1.json/.pgn. These are regression results, not proof of subjective ease or ratings.

Existing saved games use the revision on their next computer turn after a reload. That save records policy 2, its advanced seed and an upgrade event; historical moves are untouched. Both colors, reload, worker retry, cancellation and level changes passed Chrome checks. Full-strength coaching is unchanged. No new trial result for the revised difficulty is invented; future feedback can guide further adjustment.


## Revised difficulty accepted · October 18, 2026

After trying the revised Beginner, the user replied, “is fine now, continue with the goal until is completed.” This records acceptance of the new difficulty and closes the previous subjective difficulty gate. Together with “lessons are ok for now,” it is the user acceptance basis for this release. It does not claim a measured rating, a controlled study, or exhaustive review of every lesson branch.
