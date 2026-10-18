# Playtesting record and remaining human checks

## Observed user feedback · October 17, 2026

The user played the local application and requested a more physical board and pieces, direct piece dragging, smooth animations, optional legal destinations on selection, persistent best-move display, and clearer guidance about which piece to select and where it should go. Further play feedback reported disappearing recommendation labels after clicking, hard-to-understand lessons, and missing correct-answer/lesson-completion confirmation.

The implementation now includes sculpted 3D pieces and a thick wooden board; pointer-following drag with legal drop validation and smooth return; optional destination dots/rings; a saved best-move toggle; automatic source selection and destination highlighting; persistent markers naming the piece and its destination; a route banner explaining the next click; and one primary recommendation with expandable alternatives. The guidance can preview an alternative without committing it. Regression evidence is in `tests/browser/drag.spec.ts`, `best-moves.spec.ts`, and `cancellation.spec.ts`, with screenshots under `docs/evidence/`.

Lessons now use short Learn/Watch/Try stages, original movement diagrams, an autoplay/pause/step demonstration, one explicit task, visible exercise counts, and prominent correct/retry feedback. Completion automatically appears after every required exercise, with saved progress and next-lesson navigation. Most lessons have three exercises; the guided-game lesson now has a fourth exercise that reaches checkmate from the starting position. Official product-pattern research and its limits are recorded in [UX-RESEARCH.md](UX-RESEARCH.md).

Eight paired seeded policy games (both colors, four openings) now provide reproducible legal-play, reload, determinism, and timing evidence in `docs/evidence/teaching-games.json` and `.pgn`. They contain 598 plies and eight Beginner wins against First steps, with no move-limit outcomes. This is an automated policy regression, not evidence of human difficulty or learning outcomes.

The user clarified that Across the table should have separate White and Black best-move toggles, and requested a camera lock to prevent accidental board movement while dragging. Both are implemented as saved session choices and covered by Chrome reload/interaction checks. This is recorded interface feedback, not a beginner calibration result.

This feedback is real user feedback about interaction. The user's chess experience and the two teaching policies' suitability for beginners have not been established. It is not presented as a completed beginner calibration study.

Further feedback requested camera lock to stay within its game, a persistent Explain toggle, reasons explaining why a recommendation helps, and a blue interface in place of green. The Home preview is now isolated from the saved game camera; Explain saves each side's choice and refreshes on future turns; explanations combine verified board facts, a legal calculated reply, and provisional search estimates. The interface uses navy navigation, blue actions, cool backgrounds, and blue flat-board squares. These are requested interaction changes, not evidence that the teaching policies are calibrated.

When asked about chess experience and difficulty observations for both colors, the user replied “is fine for now.” The current difficulty settings are retained. No detailed trial outcomes or chess-experience information were supplied, so this records acceptance of the present settings rather than a completed beginner calibration study.

The current implementation evidence and outstanding checks are recorded in [COMPLETION-AUDIT.md](COMPLETION-AUDIT.md).

## Required before removing release-candidate status

1. Have an actual beginner complete the board/movement module, play both colors against First steps and Beginner, and retry a game-review moment. Note instructions they misunderstand, whether they can identify source/destination, and where help is needed.
2. Export the test sessions as JSON or PGN and record the level, policy version, seed, assistance, color, and observed difficulty. Use several reproducible games and more than one starting seed; do not infer a human rating from a short trial.
3. Adjust the error probabilities only in response to recorded observations and repeat the same seeded cases. Check legal play and the time budgets after any policy change. Keep coaching at independent full strength.
4. A human instructional reviewer should check all lesson wording, objectives, demonstrated continuations, accepted alternatives, feedback, and overlay readability. Automated legal replay proves legality and supported predicates; it does not establish that a lesson teaches its intended idea clearly.

No novice outcomes, measured ratings, or completed human instructional review have been invented. The verification report retains these outstanding checks.

## Further user feedback · October 18, 2026

The user reported that locked-camera drags returned pieces to their starting square, questioned the current recommendation's accuracy, and asked for piece names instead of the generic source label. Both-color perspective fixtures reproduced a drop where the piece base was on a legal square but the raw ray selected a square behind it. A shared drop-target resolver and explicit drop marker correct that discrepancy while preserving direct cursor drops and captures.

A deterministic UCI case also reproduced a completed older iteration disagreeing with the engine's final bestmove. The display now follows that final choice, keeps alternatives coherent, and refines automatic recommendations while the position stays unchanged. Actual WASM tests check both-color mates and checking knight forks, current-position keys and cancellation after a move. Source overlays now name the piece in both board views. These checks are implementation evidence and do not replace the remaining human learning and instructional reviews.
