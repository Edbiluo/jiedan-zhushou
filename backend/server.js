const express = require('express');
const path = require('path');
const fs = require('fs');
const services = require('./services');

let electronApp = null;
try { electronApp = require('electron').app; } catch {}

let serverInstance = null;

function imagesDir() {
  const base = electronApp ? electronApp.getPath('userData') : path.join(process.cwd(), '.data');
  const dir = path.join(base, 'images');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function wrap(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      if (!res.headersSent) res.json({ ok: true, data: result ?? null });
    } catch (e) {
      console.error(e);
      if (!res.headersSent) res.status(400).json({ ok: false, error: e.message });
    }
  };
}

function buildRouter() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));
  app.use('/images', express.static(imagesDir()));
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // settings
  app.get('/api/settings', wrap(() => services.settings.getAll()));
  app.put('/api/settings', wrap((req) => services.settings.update(req.body || {})));

  // styles
  app.get('/api/styles', wrap(() => services.styles.list()));
  app.post('/api/styles', wrap((req) => services.styles.create(req.body)));
  app.put('/api/styles/:id', wrap((req) => services.styles.update(+req.params.id, req.body)));
  app.delete('/api/styles/:id', wrap((req) => services.styles.remove(+req.params.id)));

  // sizes
  app.get('/api/sizes', wrap(() => services.sizes.list()));
  app.post('/api/sizes', wrap((req) => services.sizes.create(req.body)));
  app.put('/api/sizes/:id', wrap((req) => services.sizes.update(+req.params.id, req.body)));
  app.delete('/api/sizes/:id', wrap((req) => services.sizes.remove(+req.params.id)));

  // pages
  app.get('/api/pages', wrap((req) => services.pages.list(req.query)));
  app.get('/api/pages/:id', wrap((req) => services.pages.getById(+req.params.id)));
  app.post('/api/pages', wrap((req) => services.pages.create(req.body)));
  app.put('/api/pages/:id', wrap((req) => services.pages.update(+req.params.id, req.body)));
  app.delete('/api/pages/:id', wrap((req) => services.pages.remove(+req.params.id)));

  // books
  app.get('/api/books', wrap((req) => services.books.list(req.query)));
  app.get('/api/books/:id', wrap((req) => services.books.getById(+req.params.id)));
  app.post('/api/books', wrap((req) => services.books.create(req.body)));
  app.put('/api/books/:id', wrap((req) => services.books.update(+req.params.id, req.body)));
  app.delete('/api/books/:id', wrap((req) => services.books.remove(+req.params.id)));
  app.post('/api/books/:id/complete', wrap((req) => services.books.markComplete(+req.params.id)));

  // schedules
  app.get('/api/schedules/date/:date', wrap((req) => services.schedules.listByDate(req.params.date)));
  app.get('/api/schedules/range', wrap((req) => services.schedules.listRange(req.query.start, req.query.end)));
  app.get('/api/schedules/book/:id', wrap((req) => services.schedules.listByBook(+req.params.id)));
  app.post('/api/schedules/:id/progress', wrap((req) => services.schedules.reportProgress(+req.params.id, req.body)));
  app.post('/api/schedules/:id/move', wrap((req) => services.schedules.overrideMove(+req.params.id, req.body.date)));
  app.post('/api/schedules/recompute/book/:id', wrap((req) => services.schedules.recomputeForBook(+req.params.id)));
  app.post('/api/schedules/recompute/all', wrap(() => services.schedules.recomputeAll()));

  // leaves
  app.get('/api/leaves', wrap((req) => services.leaves.list(req.query)));
  app.post('/api/leaves', wrap((req) => services.leaves.create(req.body)));
  app.delete('/api/leaves/:date', wrap((req) => services.leaves.remove(req.params.date)));

  // day log / daily hours
  app.get('/api/day-log/:date', wrap((req) => services.dayLog.get(req.params.date)));
  app.post('/api/day-log/:date', wrap((req) => services.dayLog.report(req.params.date, req.body)));
  app.get('/api/day-hours/:date', wrap((req) => ({ date: req.params.date, hours: services.dayLog.getDailyHours(req.params.date) })));
  app.put('/api/day-hours/:date', wrap((req) => services.dayLog.setDailyHours(req.params.date, req.body.hours)));

  // stats
  app.get('/api/stats/summary', wrap((req) => services.stats.summary(req.query.from, req.query.to)));

  // health
  app.get('/api/health', (_, res) => res.json({ ok: true, version: '0.1.0' }));

  return app;
}

function startServer(port = 3899) {
  const app = buildRouter();
  serverInstance = app.listen(port, '127.0.0.1', () => {
    console.log(`[jiedan] api server running http://127.0.0.1:${port}`);
  });
  return serverInstance;
}

function stopServer() {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
  }
}

module.exports = { startServer, stopServer, buildRouter };
