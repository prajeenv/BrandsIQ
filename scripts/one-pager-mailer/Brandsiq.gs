/**
 * Brandsiq.gs — the BrandsIQ generate-response call.
 *
 * POST {BRANDSIQ_BASE_URL}/api/integrations/generate-response
 *   Authorization: Bearer {INTEGRATIONS_API_KEY}
 *   body: { reviewText, rating?, platform: "Google" }
 *   200 success → data.responseText (the generated reply, body only)
 *
 * The reply follows the review's detected language (BrandsIQ default), so a
 * German review yields a German reply — no language parameter is sent.
 *
 * Spec: docs/MVP_Phase-1/ONE_PAGER_MAILER_DESIGN.md Section 10.
 */

/**
 * Ensure the row's "Generated Response" cell is populated. Reuses an existing
 * value with NO API call (idempotency); otherwise calls BrandsIQ, writes the
 * result immediately, and returns it.
 *
 * Throws (→ row marked Error by the caller's guard) when the Review is blank or
 * longer than REVIEW_MAX, because the endpoint would reject it with a 400.
 *
 * @param {Sheet} sheet
 * @param {number} rowNumber 1-based
 * @param {Array} rowValues
 * @param {Object} headerMap
 * @return {string} the generated response text
 */
function ensureGeneratedResponse(sheet, rowNumber, rowValues, headerMap) {
  var existing = trim_(getCell(rowValues, headerMap, "Generated Response"));
  if (existing !== "") {
    return existing; // reuse — no re-call, no credit/rate-limit hit
  }

  var reviewText = trim_(getCell(rowValues, headerMap, "Review"));
  if (reviewText === "") {
    throw new Error("Review is empty; cannot generate a response.");
  }
  if (reviewText.length > REVIEW_MAX) {
    throw new Error(
      "Review is " + reviewText.length + " chars; exceeds the " + REVIEW_MAX + "-char limit."
    );
  }

  var rating = parseRating_(getCell(rowValues, headerMap, "Ratings"));
  var responseText = callBrandsiq(reviewText, rating);

  // Write immediately so a crash after the (paid) call doesn't lose the result.
  setCell(sheet, rowNumber, headerMap, "Generated Response", responseText);
  return responseText;
}

/**
 * Call the BrandsIQ endpoint. Reads BRANDSIQ_BASE_URL + INTEGRATIONS_API_KEY
 * from Script Properties. Retries on 429 with exponential backoff.
 *
 * @param {string} reviewText  1–REVIEW_MAX chars (caller guarantees).
 * @param {number|null} rating  1–5 or null (omitted from the body when null).
 * @return {string} data.responseText
 */
function callBrandsiq(reviewText, rating) {
  var props = PropertiesService.getScriptProperties();
  var baseUrl = props.getProperty(PROP_BASE_URL);
  var apiKey = props.getProperty(PROP_API_KEY);

  if (!baseUrl) {
    throw new Error("Script Property " + PROP_BASE_URL + " is not set.");
  }
  if (!apiKey) {
    throw new Error("Script Property " + PROP_API_KEY + " is not set.");
  }

  var url = baseUrl.replace(/\/+$/, "") + BRANDSIQ_GENERATE_PATH;
  var body = { reviewText: reviewText, platform: PLATFORM };
  if (rating !== null) {
    body.rating = rating;
  }

  var options = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + apiKey },
    payload: JSON.stringify(body),
    muteHttpExceptions: true, // mandatory: handle 4xx/5xx ourselves
  };

  var attempt = 0;
  while (true) {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var text = response.getContentText();

    if (code === 200) {
      var json = parseJsonOrThrow_(text, code);
      if (json && json.success && json.data && json.data.responseText) {
        return json.data.responseText;
      }
      throw new Error("BrandsIQ returned 200 but no responseText.");
    }

    if (code === 429) {
      if (attempt < MAX_RETRIES) {
        var waitMs =
          BASE_BACKOFF_MS * Math.pow(2, attempt) +
          Math.floor(Math.random() * MAX_JITTER_MS);
        Utilities.sleep(waitMs);
        attempt++;
        continue;
      }
      throw new Error("BrandsIQ rate limit (429) exceeded after retries.");
    }

    // 401 / 503 are operator-actionable config faults — surface clearly. Every
    // row failing with the same message makes a misconfiguration obvious.
    if (code === 401) {
      throw new Error(
        "BrandsIQ auth failed (401). Check " + PROP_API_KEY + " matches the server."
      );
    }
    if (code === 503) {
      throw new Error("BrandsIQ not configured (503). " + errorMessageFrom_(text));
    }
    if (code === 400) {
      throw new Error("BrandsIQ rejected the request (400). " + errorMessageFrom_(text));
    }
    // 500 / anything else.
    throw new Error("BrandsIQ error (" + code + "). " + errorMessageFrom_(text));
  }
}

/**
 * Parse a "Ratings" cell into an integer 1–5, or null if absent/out of range.
 * @private
 */
function parseRating_(value) {
  if (value === null || value === undefined || value === "") return null;
  var n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 5) return null;
  return n;
}

/**
 * Parse a JSON string; throw a clear error if it isn't JSON (a 500 may return
 * a non-JSON body).
 * @private
 */
function parseJsonOrThrow_(text, code) {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("BrandsIQ returned a non-JSON response (HTTP " + code + ").");
  }
}

/**
 * Best-effort extraction of error.message from an error envelope; falls back to
 * a trimmed snippet of the raw body.
 * @private
 */
function errorMessageFrom_(text) {
  try {
    var json = JSON.parse(text);
    if (json && json.error && json.error.message) {
      return json.error.message;
    }
  } catch (e) {
    // not JSON — fall through
  }
  var snippet = String(text || "").substring(0, 200);
  return snippet;
}
