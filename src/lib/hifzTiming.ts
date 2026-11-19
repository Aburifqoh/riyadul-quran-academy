// ─────────────────────────────────────────────
// src/lib/hifzTiming.ts
// The three timeouts in the grading pipeline, and the rule that binds them.
//
// These were three numbers in three files, in two languages, with nothing
// saying they were related. Raising the recording cap from 120s to 300s without
// touching the other two produced a pipeline that let a student record for five
// minutes and then hung up on the grader after thirty seconds — a failure they
// would only discover after finishing the recitation.
//
// THE INVARIANT
//
//   RECORDING_CAP  <=  GRADER_TIMEOUT  <=  ROUTE_TIMEOUT
//
// Read left to right, each stage must outlast the one feeding it:
//
//   RECORDING_CAP   how long a student may record. Every downstream stage has
//                   to cope with a take this long, so it is the floor for
//                   everything else, never the thing you raise last.
//
//   GRADER_TIMEOUT  how long the Modal container has to transcribe, align and
//                   score it. Must exceed RECORDING_CAP: Whisper chunks the
//                   audio and forced alignment runs over the whole take, so
//                   processing is not free relative to duration.
//
//   ROUTE_TIMEOUT   how long api/hifz-review waits. Must be at least
//                   GRADER_TIMEOUT, or the route abandons a request the GPU is
//                   still working on — and bills for it anyway.
//
// GRADER_TIMEOUT is enforced in a different language and a different repo
// (hifz-api/modal_app.py, `timeout=`). It is mirrored here so the relationship
// is visible from the side that changes most often, and modal_app.py carries a
// comment pointing back. Change one, change both.
// ─────────────────────────────────────────────

/** Longest single take, in seconds. Covers a full fifteen-line page at a
 *  measured pace, which is the largest passage the page selector offers. */
export const RECORDING_CAP_SECONDS = 180;

/** Must match `timeout=` on the @app.cls in hifz-api/modal_app.py. */
export const GRADER_TIMEOUT_SECONDS = 300;

/** Next.js route budget for api/hifz-review.
 *
 *  Next reads route segment config by static analysis and rejects an imported
 *  identifier ("Unknown identifier ... at maxDuration"), so route.ts cannot
 *  import this — it repeats the literal and asserts the two are equal. That
 *  assertion is the only reason the duplication is safe. */
export const ROUTE_TIMEOUT_SECONDS = 300;

// Checked at module load rather than left to a test nobody runs. These are
// literals, so this resolves during `next build` — a violation fails the build
// instead of reaching a student mid-recitation.
if (RECORDING_CAP_SECONDS > GRADER_TIMEOUT_SECONDS) {
  throw new Error(
    `Hifz timing invariant broken: a student may record for ${RECORDING_CAP_SECONDS}s but the ` +
    `grader gives up at ${GRADER_TIMEOUT_SECONDS}s. Raise timeout= in hifz-api/modal_app.py ` +
    `(and GRADER_TIMEOUT_SECONDS here) before raising the recording cap.`
  );
}
if (GRADER_TIMEOUT_SECONDS > ROUTE_TIMEOUT_SECONDS) {
  throw new Error(
    `Hifz timing invariant broken: the grader may take ${GRADER_TIMEOUT_SECONDS}s but the route ` +
    `hangs up at ${ROUTE_TIMEOUT_SECONDS}s, abandoning work the GPU is still being billed for.`
  );
}
