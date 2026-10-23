/**
 * Shared authorization helpers for the organizer CRUD surface.
 *
 * The scoring path has always enforced ownership (scoringService's
 * assertOwnership). These helpers bring the same rule to matches,
 * tournaments, teams and squads: a scorer may only mutate resources
 * they created, updates go through a per-resource field allowlist
 * (never `{ $set: req.body }`), and resource ids come from the URL.
 */

/** Copy only the allowlisted keys that are present in `body`. */
function pickFields(body, allowed) {
  const out = {};
  if (!body || typeof body !== "object") return out;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) out[key] = body[key];
  }
  return out;
}

/** True when the document was created by this scorer. */
function isOwner(doc, scorerId) {
  return !!doc && !!scorerId && String(doc.createdBy) === String(scorerId);
}

/**
 * Load a document and enforce ownership, writing the error response.
 * Returns the document, or null after responding 404 (missing) /
 * 403 (owned by someone else).
 */
async function loadOwned(res, Model, id, scorerId, label) {
  const doc = await Model.findById(id);
  if (!doc) {
    res.status(404).json({ message: `${label} not found` });
    return null;
  }
  if (!isOwner(doc, scorerId)) {
    res
      .status(403)
      .json({ message: `You can only modify your own ${label.toLowerCase()}` });
    return null;
  }
  return doc;
}

module.exports = { pickFields, isOwner, loadOwned };
