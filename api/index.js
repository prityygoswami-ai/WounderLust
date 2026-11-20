// Vercel Serverless Function entry point.
// Every request to /api/* is rewritten here (see vercel.json) and handled by the shared router.
const { handle } = require('../lib/router');

module.exports = async (req, res) => {
  await handle(req, res);
};
