/**
 * HTTP error plumbing shared by the service layer and controllers.
 *
 * Services throw `httpError(status, message)`; controllers that call
 * them answer with `sendHttpError`, which maps the error's status (or
 * 500) and message — one place for the rule instead of a copy of the
 * catch block in every handler.
 */

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function sendHttpError(res, error) {
  return res
    .status(error?.status || 500)
    .json({ message: error?.message || "Internal Server Error" });
}

module.exports = { httpError, sendHttpError };
