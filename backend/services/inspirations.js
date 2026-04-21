const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

let app = null;
try { app = require('electron').app; } catch {}

let sharp;
try { sharp = require('sharp'); } catch { sharp = null; }

function imageDir(sub) {
  const base = app ? app.getPath('userData') : path.join(process.cwd(), '.data');
  const dir = path.join(base, 'images', sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function saveImage(srcPath) {
  const ext = (path.extname(srcPath) || '.png').toLowerCase();
  const id = uuidv4();
  const originalName = `${id}${ext}`;
  const thumbName = `${id}.jpg`;
  const originalDest = path.join(imageDir('inspiration-original'), originalName);
  const thumbDest = path.join(imageDir('inspiration-thumb'), thumbName);

  fs.copyFileSync(srcPath, originalDest);
  if (sharp) {
    await sharp(srcPath)
      .resize({ width: 520, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbDest);
  } else {
    fs.copyFileSync(srcPath, thumbDest);
  }
  return {
    image_path: path.join('inspiration-original', originalName).replace(/\\/g, '/'),
    thumb_path: path.join('inspiration-thumb', thumbName).replace(/\\/g, '/'),
  };
}

async function saveImageFromBytes(buffer, extHint) {
  let ext = (extHint || '.png').toLowerCase();
  if (!ext.startsWith('.')) ext = '.' + ext;
  if (!/^\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(ext)) ext = '.png';

  const id = uuidv4();
  const originalName = `${id}${ext}`;
  const thumbName = `${id}.jpg`;
  const originalDest = path.join(imageDir('inspiration-original'), originalName);
  const thumbDest = path.join(imageDir('inspiration-thumb'), thumbName);

  fs.writeFileSync(originalDest, buffer);
  if (sharp) {
    await sharp(buffer).resize({ width: 520, withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(thumbDest);
  } else {
    fs.writeFileSync(thumbDest, buffer);
  }
  return {
    image_path: path.join('inspiration-original', originalName).replace(/\\/g, '/'),
    thumb_path: path.join('inspiration-thumb', thumbName).replace(/\\/g, '/'),
  };
}

function list({ keyword } = {}) {
  const conds = [];
  const params = {};
  if (keyword) {
    conds.push('note LIKE @keyword');
    params.keyword = `%${keyword}%`;
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  return getDb()
    .prepare(`SELECT * FROM inspiration ${where} ORDER BY created_at DESC, id DESC`)
    .all(params);
}

function getById(id) {
  return getDb().prepare('SELECT * FROM inspiration WHERE id = ?').get(id);
}

async function create({ src_path, content_base64, ext, note = '' }) {
  let image_path, thumb_path;
  if (content_base64) {
    const buffer = Buffer.from(content_base64, 'base64');
    if (!buffer || !buffer.length) throw new Error('empty content');
    ({ image_path, thumb_path } = await saveImageFromBytes(buffer, ext));
  } else if (src_path) {
    ({ image_path, thumb_path } = await saveImage(src_path));
  } else {
    throw new Error('src_path or content_base64 required');
  }
  const info = getDb()
    .prepare(
      `INSERT INTO inspiration (image_path, thumb_path, note) VALUES (?, ?, ?)`
    )
    .run(image_path, thumb_path, note || '');
  return getById(info.lastInsertRowid);
}

function update(id, { note }) {
  const cur = getById(id);
  if (!cur) throw new Error('inspiration not found');
  getDb()
    .prepare(`UPDATE inspiration SET note = ? WHERE id = ?`)
    .run(note ?? cur.note, id);
  return getById(id);
}

function remove(id) {
  const cur = getById(id);
  if (!cur) throw new Error('inspiration not found');
  const base = app ? app.getPath('userData') : path.join(process.cwd(), '.data');
  for (const rel of [cur.image_path, cur.thumb_path]) {
    const abs = path.join(base, 'images', rel);
    try { fs.unlinkSync(abs); } catch {}
  }
  getDb().prepare('DELETE FROM inspiration WHERE id = ?').run(id);
  return { id };
}

module.exports = { list, getById, create, update, remove };
