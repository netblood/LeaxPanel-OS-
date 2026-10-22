// Real file manager: browse, upload, edit, rename, move, delete, zip, extract.
const express = require('express');
const router = express.Router();
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const multer = require('multer');
const db = require('../config/db');
const { handleValidationErrors, idParam } = require('../middleware/validation');
const { formatBytes, formatDate } = require('../utils/helpers');
const logger = require('../utils/logger');

const ROOT = path.join(__dirname, '..', '..');
const FILES_DIR = path.join(ROOT, 'data', 'files');
const UPLOAD_DIR = path.join(ROOT, 'data', 'uploads');
for (const dir of [FILES_DIR, UPLOAD_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const blocked = ['.exe', '.bat', '.cmd', '.com', '.scr', '.msi'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (blocked.includes(ext)) return cb(new Error('Executable uploads are blocked'));
    cb(null, true);
  }
});

/**
 * Resolves a user supplied relative path inside the managed root,
 * refusing any traversal outside of it.
 */
function resolveSafe(relative) {
  const cleaned = String(relative || '').replace(/^[\\/]+/, '').replace(/\.\./g, '');
  const target = path.resolve(FILES_DIR, cleaned);
  if (!target.startsWith(path.resolve(FILES_DIR))) {
    throw new Error('Invalid path');
  }
  return target;
}

function describe(entry, fullPath) {
  const stat = fs.statSync(fullPath);
  return {
    name: entry,
    path: path.relative(FILES_DIR, fullPath).split(path.sep).join('/'),
    isDir: stat.isDirectory(),
    size: stat.size,
    sizeLabel: stat.isDirectory() ? '—' : formatBytes(stat.size),
    modified: stat.mtime.toISOString(),
    modifiedLabel: formatDate(stat.mtime.toISOString(), true)
  };
}

function listDirectory(relative) {
  const target = resolveSafe(relative);
  if (!fs.existsSync(target)) return [];
  return fs.readdirSync(target)
    .map(entry => describe(entry, path.join(target, entry)))
    .sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function syncIndex(relative, userId) {
  try {
    const files = listDirectory(relative);
    db.run('DELETE FROM file_manager_files WHERE user_id = ?', [userId]);
    for (const file of files.filter(f => !f.isDir)) {
      db.run(
        `INSERT INTO file_manager_files (name, original_name, file_path, size_bytes, mime_type, user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [file.name, file.name, file.path, file.size, 'application/octet-stream', userId]
      );
    }
  } catch (err) {
    logger.warn('File index sync failed:', err.message);
  }
}

router.get('/', (req, res) => {
  try {
    const currentPath = String(req.query.path || '');
    const entries = listDirectory(currentPath);
    syncIndex(currentPath, req.session.user.id);

    const breadcrumbs = [];
    let acc = '';
    for (const part of currentPath.split('/').filter(Boolean)) {
      acc = acc ? `${acc}/${part}` : part;
      breadcrumbs.push({ name: part, path: acc });
    }

    res.render('fileManager/index', {
      title: 'File Manager',
      pageTitle: 'File Manager',
      pageSubtitle: 'Upload, edit, move and archive your files',
      entries,
      rows: entries,
      files: entries,
      currentPath,
      breadcrumbs,
      totalSize: entries.reduce((sum, e) => sum + (e.isDir ? 0 : e.size), 0)
    });
  } catch (err) {
    logger.error('File manager error:', err);
    req.flash('error', `Could not open folder: ${err.message}`);
    res.redirect('/file-manager');
  }
});

router.post('/upload', upload.array('files', 20), handleValidationErrors, async (req, res) => {
  try {
    const target = resolveSafe(req.body.path || '');
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

    for (const file of req.files || []) {
      const destination = path.join(target, file.originalname.replace(/[^a-zA-Z0-9._ -]/g, '_'));
      await fsp.rename(file.path, destination).catch(async err => {
        if (err.code === 'EXDEV') {
          await fsp.copyFile(file.path, destination);
          await fsp.unlink(file.path);
        } else {
          throw err;
        }
      });

      db.run(
        `INSERT INTO file_manager_files (name, original_name, file_path, size_bytes, mime_type, user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          path.basename(destination),
          file.originalname,
          path.relative(FILES_DIR, destination).split(path.sep).join('/'),
          file.size,
          file.mimetype || 'application/octet-stream',
          req.session.user.id
        ]
      );
    }

    req.flash('success', `${(req.files || []).length} file(s) uploaded.`);
  } catch (err) {
    logger.error('Upload error:', err);
    req.flash('error', `Upload failed: ${err.message}`);
  }
  res.redirect(`/file-manager?path=${encodeURIComponent(req.body.path || '')}`);
});

router.get('/download', (req, res) => {
  try {
    const target = resolveSafe(req.query.path);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      req.flash('error', 'File not found.');
      return res.redirect('/file-manager');
    }
    res.download(target);
  } catch (err) {
    req.flash('error', `Download failed: ${err.message}`);
    res.redirect('/file-manager');
  }
});

router.get('/edit', (req, res) => {
  try {
    const target = resolveSafe(req.query.path);
    if (!fs.existsSync(target)) {
      req.flash('error', 'File not found.');
      return res.redirect('/file-manager');
    }
    const content = fs.readFileSync(target, 'utf8');
    res.render('fileManager/edit', {
      title: 'Edit file',
      pageTitle: 'Edit file',
      filePath: String(req.query.path || ''),
      fileName: path.basename(target),
      content: content.length > 500000 ? content.slice(0, 500000) : content,
      truncated: content.length > 500000
    });
  } catch (err) {
    req.flash('error', `Could not open file: ${err.message}`);
    res.redirect('/file-manager');
  }
});

router.post('/edit', handleValidationErrors, (req, res) => {
  try {
    const target = resolveSafe(req.body.path);
    if (!fs.existsSync(target)) {
      req.flash('error', 'File not found.');
      return res.redirect('/file-manager');
    }
    fs.writeFileSync(target, String(req.body.content || ''), 'utf8');
    req.flash('success', 'File saved.');
  } catch (err) {
    req.flash('error', `Could not save file: ${err.message}`);
  }
  res.redirect(`/file-manager/edit?path=${encodeURIComponent(req.body.path || '')}`);
});

router.post('/rename', handleValidationErrors, (req, res) => {
  try {
    const target = resolveSafe(req.body.path);
    const name = String(req.body.name || '').replace(/[\\/]/g, '').trim();
    if (!name) {
      req.flash('error', 'A new name is required.');
      return res.redirect('/file-manager');
    }
    if (!fs.existsSync(target)) {
      req.flash('error', 'File not found.');
      return res.redirect('/file-manager');
    }
    const destination = path.join(path.dirname(target), name);
    if (!destination.startsWith(path.resolve(FILES_DIR))) {
      req.flash('error', 'Invalid destination.');
      return res.redirect('/file-manager');
    }
    fs.renameSync(target, destination);
    req.flash('success', `Renamed to ${name}.`);
  } catch (err) {
    req.flash('error', `Rename failed: ${err.message}`);
  }
  res.redirect(`/file-manager?path=${encodeURIComponent(req.body.dir || '')}`);
});

router.post('/move', handleValidationErrors, (req, res) => {
  try {
    const target = resolveSafe(req.body.path);
    const destinationDir = resolveSafe(req.body.destination || '');
    if (!fs.existsSync(target)) {
      req.flash('error', 'File not found.');
      return res.redirect('/file-manager');
    }
    if (!fs.existsSync(destinationDir)) fs.mkdirSync(destinationDir, { recursive: true });
    const destination = path.join(destinationDir, path.basename(target));
    fs.renameSync(target, destination);
    req.flash('success', `Moved to ${path.relative(FILES_DIR, destinationDir) || '/'}.`);
  } catch (err) {
    req.flash('error', `Move failed: ${err.message}`);
  }
  res.redirect('/file-manager');
});

router.post('/delete', handleValidationErrors, (req, res) => {
  try {
    const target = resolveSafe(req.body.path);
    if (!fs.existsSync(target)) {
      req.flash('error', 'File not found.');
      return res.redirect('/file-manager');
    }
    fs.rmSync(target, { recursive: true, force: true });
    db.run('DELETE FROM file_manager_files WHERE file_path = ?', [String(req.body.path || '')]);
    req.flash('success', 'Deleted successfully.');
  } catch (err) {
    req.flash('error', `Delete failed: ${err.message}`);
  }
  res.redirect(`/file-manager?path=${encodeURIComponent(req.body.dir || '')}`);
});

router.post('/mkdir', handleValidationErrors, (req, res) => {
  try {
    const name = String(req.body.name || '').replace(/[\\/]/g, '').trim();
    if (!name) {
      req.flash('error', 'A folder name is required.');
      return res.redirect('/file-manager');
    }
    const parent = resolveSafe(req.body.dir || '');
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.mkdirSync(path.join(parent, name), { recursive: true });
    req.flash('success', `Folder ${name} created.`);
  } catch (err) {
    req.flash('error', `Could not create folder: ${err.message}`);
  }
  res.redirect(`/file-manager?path=${encodeURIComponent(req.body.dir || '')}`);
});

router.post('/zip', handleValidationErrors, (req, res) => {
  try {
    const source = resolveSafe(req.body.path);
    if (!fs.existsSync(source)) {
      req.flash('error', 'Nothing to archive.');
      return res.redirect('/file-manager');
    }
    const archiveName = `${path.basename(source)}.zip`;
    const archivePath = path.join(path.dirname(source), archiveName);
    const entries = fs.statSync(source).isDirectory()
      ? fs.readdirSync(source).map(entry => path.join(source, entry))
      : [source];

    // Minimal ZIP writer (store method, no compression) - no external dependency.
    writeZip(archivePath, entries);

    req.flash('success', `Archive ${archiveName} created.`);
  } catch (err) {
    logger.error('Zip error:', err);
    req.flash('error', `Could not create archive: ${err.message}`);
  }
  res.redirect(`/file-manager?path=${encodeURIComponent(req.body.dir || '')}`);
});

function writeZip(archivePath, entries) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const stat = fs.statSync(entry);
    if (!stat.isFile()) continue;
    const name = path.basename(entry);
    const nameBuf = Buffer.from(name, 'utf8');
    const data = fs.readFileSync(entry);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, nameBuf, data);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt16LE(0, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(data.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(nameBuf.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(0, 38);
    header.writeUInt32LE(offset, 42);

    central.push(header, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(central.length / 2 - 1, 8);
  end.writeUInt16LE(central.length / 2 - 1, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  fs.writeFileSync(archivePath, Buffer.concat([...chunks, centralBuf, end]));
}

function crc32(buffer) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

router.post('/extract', handleValidationErrors, (req, res) => {
  try {
    const target = resolveSafe(req.body.path);
    if (!fs.existsSync(target) || !target.endsWith('.zip')) {
      req.flash('error', 'Only .zip archives can be extracted.');
      return res.redirect('/file-manager');
    }
    const { execFileSync } = require('child_process');
    const destination = path.join(path.dirname(target), `${path.basename(target, '.zip')}-extracted`);
    if (!fs.existsSync(destination)) fs.mkdirSync(destination, { recursive: true });
    try {
      execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${target}' -DestinationPath '${destination}' -Force`], { stdio: 'pipe' });
    } catch (err) {
      execFileSync('unzip', ['-o', target, '-d', destination], { stdio: 'pipe' });
    }
    req.flash('success', 'Archive extracted.');
  } catch (err) {
    logger.error('Extract error:', err);
    req.flash('error', `Could not extract archive: ${err.message}`);
  }
  res.redirect(`/file-manager?path=${encodeURIComponent(req.body.dir || '')}`);
});

module.exports = router;
module.exports.FILES_DIR = FILES_DIR;
