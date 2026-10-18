# Teaching and move-guide usability changes

October 17, 2026. The user reported disappearing move labels, unclear source/destination meaning, difficult lesson instructions, and insufficient completion feedback.

## Public product research

- [Lichess Chess basics](https://lichess.org/learn) organizes learning into named, focused skills, starting with individual pieces and then rules and tactical fundamentals. Its public [Practice library](https://lichess.org/practice) also groups positions by a named skill. The accessible page/search text was reviewed; this is not a claim to have completed its client-side lessons or signed into an account.
- [Chess.com’s lesson guide](https://support.chess.com/en/articles/8609703-how-do-lessons-work-on-chess-com) describes a guided path, coach explanations, interactive challenges, visible progress, and a browsable library.
- [Chess.com’s Play Coach guide](https://support.chess.com/en/articles/10877257-how-do-i-play-against-the-coach) describes progressive hints and configurable suggestion arrows, threats and feedback.

These are interaction patterns, not imported lesson text, positions, artwork, or branded presentation. Chess Workshop’s summaries, movement diagrams, exercises and feedback remain original and bundled offline.

## Implemented response

The recommendation guide is separate from the player’s current selection. Clicking a piece, another piece, or an empty square does not remove it. Only a changed position, disabled best-move mode, or an explicitly inactive game invalidates that advice. The move list shows every legal choice, led by the engine-ranked candidates; the rest are identified as unranked. Selecting a row previews its route. Waiting on the same position does not silently replace the recommendation; a player can explicitly request deeper analysis. Labels say “the actual piece name” and “MOVE HERE,” and a visible sentence explains the piece, its square, and its destination. A selected-piece instruction appears only when that piece is actually selected.

Lessons use Learn → Watch → Try stages, short original rule summaries, contextual definitions, and movement-shape diagrams. A demonstration shows its next route and supports autoplay, pause and manual stepping. New teaching sessions use a clear flat learning view, with the 3D view still available. The practice stage displays one goal and a direct explanation of click/drag input.

A correct complete answer produces a prominent Correct message and an explanation. An intermediate correct move instead says Correct so far and explains the opponent’s reply. Incorrect legal moves repeat the specific objective, and mate feedback distinguishes a remaining reply, lack of check and stalemate. Completing every exercise automatically produces a Lesson complete screen with the completed count, save confirmation, and a working Continue learning action. Persisted exercise IDs prevent a drill started midway through a lesson from prematurely claiming the entire lesson is finished. Earlier saved final answers receive the same completion screen with their learning credit preserved once. Reopened attempts and demonstrations do not require a game-clock Resume action. In multi-move tasks, progressive hint text and board targets follow the current move rather than the original starting square, and obsolete targets clear after success.

The user’s feedback is direct usability evidence. It does not establish beginner difficulty calibration or a complete human review of all instructional content; those remain separately recorded in PLAYTESTING.md.
