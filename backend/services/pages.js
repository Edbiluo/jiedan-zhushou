const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

let app = null;
try { app = require('electron').app; } catch {}

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}

function imageDir(sub) {
  const base = app ? app.getPath('userData') : path.join(process.cwd(), '.data');
  const dir = path.join(base, 'images', sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function saveImageFromPath(srcPath) {
  const ext = (path.extname(srcPath) || '.png').toLowerCase();
  const id = uuidv4();
  const originalName = `${id}${ext}`;
  const thumbName = `${id}.jpg`;
  const originalDest = path.join(imageDir('original'), originalName);
  const thumbDest = path.join(imageDir('thumb'), thumbName);

  fs.copyFileSync(srcPath, originalDest);

  if (sharp) {
    await sharp(srcPath).resize({ width: 480, withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(thumbDest);
  } else {
    fs.copyFileSync(srcPath, thumbDest);
  }

  return {
    image_path: path.join('original', originalName).replace(/\\/g, '/'),
    thumb_path: path.join('thumb', thumbName).replace(/\\/g, '/'),
  };
}

async function saveImageFromBytes(buffer, extHint) {
  let ext = (extHint || '.png').toLowerCase();
  if (!ext.startsWith('.')) ext = '.' + ext;
  // 非常见扩展名兜底到 .png
  if (!/^\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(ext)) ext = '.png';

  const id = uuidv4();
  const originalName = `${id}${ext}`;
  const thumbName = `${id}.jpg`;
  const originalDest = path.join(imageDir('original'), originalName);
  const thumbDest = path.join(imageDir('thumb'), thumbName);

  fs.writeFileSync(originalDest, buffer);

  if (sharp) {
    await sharp(buffer).resize({ width: 480, withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(thumbDest);
  } else {
    fs.writeFileSync(thumbDest, buffer);
  }

  return {
    image_path: path.join('original', originalName).replace(/\\/g, '/'),
    thumb_path: path.join('thumb', thumbName).replace(/\\/g, '/'),
  };
}

function list({ style_id, size_id, is_cover, keyword } = {}) {
  const conds = [];
  const params = {};
  if (style_id != null) { conds.push('style_id = @style_id'); params.style_id = style_id; }
  if (size_id != null) { conds.push('size_id = @size_id'); params.size_id = size_id; }
  if (is_cover != null) { conds.push('is_cover = @is_cover'); params.is_cover = is_cover ? 1 : 0; }
  if (keyword) { conds.push('title LIKE @keyword'); params.keyword = `%${keyword}%`; }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  return getDb()
    .prepare(`SELECT * FROM page ${where} ORDER BY created_at DESC, id DESC`)
    .all(params);
}

function getById(id) {
  return getDb().prepare('SELECT * FROM page WHERE id = ?').get(id);
}

async function create({ title, src_path, content_base64, ext, style_id, size_id, is_cover, estimated_hours, note }) {
  let image_path, thumb_path;
  if (content_base64) {
    const buffer = Buffer.from(content_base64, 'base64');
    if (!buffer || !buffer.length) throw new Error('empty content');
    ({ image_path, thumb_path } = await saveImageFromBytes(buffer, ext));
  } else if (src_path) {
    ({ image_path, thumb_path } = await saveImageFromPath(src_path));
  } else {
    throw new Error('src_path or content_base64 required');
  }
  const info = getDb()
    .prepare(
      `INSERT INTO page (title, image_path, thumb_path, style_id, size_id, is_cover, estimated_hours, note)
       VALUES (@title, @image_path, @thumb_path, @style_id, @size_id, @is_cover, @estimated_hours, @note)`
    )
    .run({
      title: title || '未命名画页',
      image_path,
      thumb_path,
      style_id: is_cover ? null : style_id ?? null,
      size_id: is_cover ? null : size_id ?? null,
      is_cover: is_cover ? 1 : 0,
      estimated_hours: estimated_hours ?? 1,
      note: note ?? '',
    });
  return getById(info.lastInsertRowid);
}

function update(id, { title, style_id, size_id, is_cover, estimated_hours, note }) {
  const cur = getById(id);
  if (!cur) throw new Error('page not found');
  getDb()
    .prepare(
      `UPDATE page SET title = @title, style_id = @style_id, size_id = @size_id,
        is_cover = @is_cover, estimated_hours = @estimated_hours, note = @note WHERE id = @id`
    )
    .run({
      id,
      title: title ?? cur.title,
      style_id: is_cover ? null : (style_id ?? cur.style_id),
      size_id: is_cover ? null : (size_id ?? cur.size_id),
      is_cover: is_cover != null ? (is_cover ? 1 : 0) : cur.is_cover,
      estimated_hours: estimated_hours ?? cur.estimated_hours,
      note: note ?? cur.note,
    });
  return getById(id);
}

function remove(id) {
  const cur = getById(id);
  if (!cur) throw new Error('page not found');
  const base = app ? app.getPath('userData') : path.join(process.cwd(), '.data');
  for (const rel of [cur.image_path, cur.thumb_path]) {
    const abs = path.join(base, 'images', rel);
    try { fs.unlinkSync(abs); } catch {}
  }
  getDb().prepare('DELETE FROM page WHERE id = ?').run(id);
  return { id };
}

module.exports = { list, getById, create, update, remove, saveImageFromPath, saveImageFromBytes };
