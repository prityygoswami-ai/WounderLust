// HTTP helpers shared by the local server and the Vercel function.

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  // Vercel may already have parsed the body.
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return safeParse(req.body);
    if (Buffer.isBuffer(req.body)) return safeParse(req.body.toString());
    return req.body;
  }
  if (req.method === 'GET' || req.method === 'HEAD') return {};

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new HttpError(413, 'Request body too large');
    chunks.push(chunk);
  }
  return safeParse(Buffer.concat(chunks).toString());
}

function safeParse(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

module.exports = { HttpError, sendJson, readBody };
