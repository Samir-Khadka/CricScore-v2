/**
 * Pure crease-selection rules for the scorer console.
 *
 * The console page owns the React state and effects; the *rules* —
 * which players may be picked, and how the engine's selection is
 * reconciled with the scorer's — live here as pure functions so they
 * can be unit-tested without rendering the console.
 */

/** Ids of batsmen marked out in an engine state batsmen list. */
export function outBatsmanIds(stateBatsmen) {
  return new Set(
    (stateBatsmen || [])
      .filter((b) => b.status === "out")
      .map((b) => String(b.id ?? b.batsmanId))
  );
}

/**
 * Reconcile the engine's current selection for one crease end with the
 * scorer's previous pick. A dismissed batsman can never be (re)selected
 * — without this, the squad-list fallback resurrects the out player
 * and the new-batsman picker never opens. `validIds` is the batting
 * squad's id set; empty means the squad hasn't loaded, in which case
 * the engine's word is taken as-is.
 */
export function pickCreaseSelection(engineId, prevId, validIds, outIds) {
  let engine = engineId;
  if (engine && outIds.has(String(engine))) engine = null;
  if (engine && validIds.size === 0) return String(engine);
  if (engine && validIds.has(String(engine))) return String(engine);
  if (prevId && outIds.has(prevId)) return null;
  if (prevId && (validIds.size === 0 || validIds.has(prevId))) return prevId;
  return engine ? String(engine) : null;
}

/**
 * Ids that may not be picked for a crease end in the player sheet:
 * batsmen who are out, retired batsmen when the innings is waiting on
 * a new batsman, and the player already at the other end.
 * `viewBatsmen` is the inningsView batsmen list (view-model shape).
 */
export function batsmanDisabledIds(viewBatsmen, otherId, excludeRetired) {
  const s = new Set();
  for (const b of viewBatsmen || []) {
    if (b.status === "out") s.add(String(b.id));
    else if (excludeRetired && b.status === "retired hurt") s.add(String(b.id));
  }
  if (otherId) s.add(String(otherId));
  return s;
}

/**
 * Ids that may not bowl the next over: the previous over's bowler and
 * anyone who has used up their allocation — but only at the start of
 * an over (mid-over the bowler is fixed). `viewBowlers` is the
 * inningsView bowlers list.
 */
export function bowlerDisabledIds(
  viewBowlers,
  { overStart, lastOverBowlerId, maxBalls }
) {
  const s = new Set();
  if (overStart) {
    if (lastOverBowlerId) s.add(String(lastOverBowlerId));
    for (const b of viewBowlers || []) {
      if (b.balls >= maxBalls) s.add(String(b.id));
    }
  }
  return s;
}
