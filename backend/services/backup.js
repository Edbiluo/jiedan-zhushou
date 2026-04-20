const fs = require('fs');
const path = require('path');
const { getDbPath, getDb, closeDb, initDb } = require('../db');

let app = null;
try { app = require('electron').app; } catch {}

let AdmZip;
try { AdmZip = require('adm-zip'); } catch (e) { AdmZip = null; }

function baseDir() {
  return app ? app.getPath('userData') : path.join(process.cwd(), '.data');
}

function exportTo(destZip) {
  if (!AdmZip) throw new Error('adm-zip not installed');
  const zip = new AdmZip();
  const dbPath = getDbPath();
  if (dbPath && fs.existsSync(dbPath)) {
    zip.addLocalFile(dbPath, '', 'app.db');
  }
  const imagesDir = path.join(baseDir(), 'images');
  if (fs.existsSync(imagesDir)) {
    zip.addLocalFolder(imagesDir, 'images');
  }
  zip.writeZip(destZip);
  return { path: destZip };
}

function importFrom(srcZip) {
  if (!AdmZip) throw new Error('adm-zip not installed');
  const zip = new AdmZip(srcZip);
  const target = baseDir();

  const dbEntry = zip.getEntry('app.db');
  if (dbEntry) {
    closeDb();
    const dbTarget = path.join(target, 'app.db');
    fs.writeFileSync(dbTarget, dbEntry.getData());
    initDb(dbTarget);
  }

  zip.getEntries().forEach((e) => {
    if (e.entryName.startsWith('images/') && !e.isDirectory) {
      const outPath = path.join(target, e.entryName);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, e.getData());
    }
  });

  return { ok: true };
}

module.exports = { exportTo, importFrom };
