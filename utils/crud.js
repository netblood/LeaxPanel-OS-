// Generic resource router factory.
// Every panel module (domains, databases, bots, buckets, ...) shares the same
// list / create / edit / delete shape, so it is defined once here and reused.
const express = require('express');
const db = require('../config/db');
const logger = require('../utils/logger');
const { handleValidationErrors, idParam } = require('../middleware/validation');

function pick(row, keys) {
  const out = {};
  for (const key of keys) {
    out[key] = row ? row[key] : null;
  }
  return out;
}

function sanitizeConfig(value) {
  if (value === undefined || value === null || value === '') return '{}';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Reads a submitted value and normalises it.
 * Returns `undefined` when the field was left empty, which tells the caller
 * to omit the column so the database default applies.
 */
function readValue(req, field) {
  const raw = req.body[field.name];

  if (field.type === 'checkbox') {
    return (raw === 'on' || raw === 'true' || raw === '1' || raw === true) ? 1 : 0;
  }
  if (field.type === 'config') {
    const value = sanitizeConfig(raw);
    return value === '{}' ? undefined : value;
  }
  if (field.type === 'number') {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (raw === undefined || raw === null || raw === '') return undefined;
  return String(raw);
}

function buildValidators(fields) {
  const { body } = require('express-validator');
  const rules = [];
  for (const field of fields) {
    if (field.type === 'config') continue;
    let chain = body(field.name);
    if (field.required) {
      chain = chain.trim().notEmpty().withMessage(`${field.label} is required`);
    } else {
      chain = chain.optional({ values: 'falsy' });
    }
    if (field.maxLength) chain = chain.isLength({ max: field.maxLength }).withMessage(`${field.label} is too long`);
    if (field.type === 'email') chain = chain.isEmail().withMessage(`${field.label} must be a valid email`);
    if (field.type === 'number') chain = chain.isInt({ min: 0, max: 999999999 }).withMessage(`${field.label} must be a number`);
    if (field.type === 'url') chain = chain.isURL().withMessage(`${field.label} must be a valid URL`);
    if (field.options && field.options.length) {
      chain = chain.isIn(field.options).withMessage(`${field.label} is invalid`);
    }
    rules.push(chain);
  }
  return rules;
}

function createResourceRouter(config) {
  const {
    table,
    module,
    perm,
    title,
    subtitle,
    icon = 'layers',
    fields = [],
    columns = [],
    orderBy = 'created_at DESC',
    viewPrefix,
    listView,
    createView,
    editView,
    softDelete = false,
    mapRow = (row) => row,
    defaults = {},
    beforeSave = null,
    afterSave = null,
    beforeDelete = null,
    searchable = [],
    filters = []
  } = config;

  const router = express.Router();
  const prefix = viewPrefix || module;
  const writableFields = fields
    .filter(f => !f.readonly)
    .map(f => f.name);
  const timestamps = ['created_at', 'updated_at'];

  function fetchRows() {
    try {
      return db.all(`SELECT * FROM ${table} ORDER BY ${orderBy}`).map(mapRow);
    } catch (err) {
      logger.error(`${module} list error:`, err.message);
      return [];
    }
  }

  function renderList(res, extra = {}) {
    const mapped = extra.rows || fetchRows();
    res.render(listView || `${prefix}/index`, {
      title: title,
      pageTitle: title,
      pageSubtitle: subtitle,
      module,
      icon,
      rows: mapped,
      items: mapped,
      columns,
      fields,
      filters,
      loadError: extra.loadError || null,
      ...extra
    });
  }

  router.get('/', (req, res) => {
    const extra = {};
    const active = filters.find(f => f.name === req.query.filter);
    if (active && active.apply) {
      try {
        extra.rows = active.apply(db, fetchRows());
      } catch (err) {
        logger.error(`${module} filter error:`, err.message);
      }
    }
    renderList(res, extra);
  });

  router.get('/create', (req, res) => {
    res.render(createView || `${prefix}/create`, {
      title: `Create ${title}`,
      pageTitle: `Create ${title}`,
      module,
      icon,
      fields,
      columns,
      values: defaults,
      formAction: `/${prefix}/create`
    });
  });

  router.post('/create', buildValidators(fields), handleValidationErrors, (req, res) => {
    try {
      const data = {};
      for (const field of fields) {
        if (field.readonly) continue;
        const value = readValue(req, field);
        if (value !== undefined) data[field.name] = value;
      }

      // Explicit defaults only fill in columns that were left untouched.
      for (const key of Object.keys(defaults)) {
        if (data[key] === undefined) data[key] = defaults[key];
      }

      if (beforeSave) {
        const result = beforeSave(req, data);
        if (result && result.error) {
          req.flash('error', result.error);
          return res.redirect(`/${prefix}/create`);
        }
      }

      const keys = Object.keys(data);
      const values = keys.map(k => data[k]);
      const placeholders = keys.map(() => '?').join(', ');
      const hasCreated = timestamps.includes('created_at');
      const hasUpdated = timestamps.includes('updated_at');

      const sql = `INSERT INTO ${table} (${keys.join(', ')}, ${hasCreated ? "created_at" : ''}${hasCreated && hasUpdated ? ', ' : ''}${hasUpdated ? "updated_at" : ''})
                  VALUES (${placeholders}, ${hasCreated ? "datetime('now')" : ''}${hasCreated && hasUpdated ? ', ' : ''}${hasUpdated ? "datetime('now')" : ''})`;

      const result = db.run(sql, values);
      if (afterSave) afterSave(req, data, result.lastInsertRowid);

      req.flash('success', `${title} created successfully`);
      res.redirect(`/${prefix}`);
    } catch (err) {
      logger.error(`Create ${module} error:`, err);
      req.flash('error', `Failed to create ${title.toLowerCase()}: ${err.message}`);
      res.redirect(`/${prefix}/create`);
    }
  });

  router.get('/:id/edit', idParam, handleValidationErrors, (req, res) => {
    try {
      const row = db.get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!row) {
        req.flash('error', `${title} not found`);
        return res.redirect(`/${prefix}`);
      }
      res.render(editView || `${prefix}/edit`, {
        title: `Edit ${title}`,
        pageTitle: `Edit ${title}`,
        module,
        icon,
        fields,
        columns,
        item: mapRow(row),
        values: mapRow(row),
        formAction: `/${prefix}/${row.id}/edit`
      });
    } catch (err) {
      logger.error(`Edit ${module} error:`, err);
      req.flash('error', `Failed to load ${title.toLowerCase()}`);
      res.redirect(`/${prefix}`);
    }
  });

  router.post('/:id/edit', idParam, buildValidators(fields), handleValidationErrors, (req, res) => {
    try {
      const row = db.get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!row) {
        req.flash('error', `${title} not found`);
        return res.redirect(`/${prefix}`);
      }

      const data = {};
      for (const field of fields) {
        if (field.readonly) continue;
        const value = readValue(req, field);
        if (value !== undefined) {
          data[field.name] = value;
        } else if (field.required) {
          // Required fields keep their current value when submitted empty.
          data[field.name] = row[field.name];
        }
      }

      if (beforeSave) {
        const result = beforeSave(req, data, row);
        if (result && result.error) {
          req.flash('error', result.error);
          return res.redirect(`/${prefix}/${req.params.id}/edit`);
        }
      }

      const keys = Object.keys(data);
      const hasUpdated = timestamps.includes('updated_at');
      const assignments = keys.map(k => `${k} = ?`).join(', ');
      const values = keys.map(k => data[k]);
      if (hasUpdated) {
        db.run(`UPDATE ${table} SET ${assignments}, updated_at = datetime('now') WHERE id = ?`, [...values, req.params.id]);
      } else {
        db.run(`UPDATE ${table} SET ${assignments} WHERE id = ?`, [...values, req.params.id]);
      }

      if (afterSave) afterSave(req, data, row.id);

      req.flash('success', `${title} updated successfully`);
      res.redirect(`/${prefix}`);
    } catch (err) {
      logger.error(`Update ${module} error:`, err);
      req.flash('error', `Failed to update ${title.toLowerCase()}: ${err.message}`);
      res.redirect(`/${prefix}/${req.params.id}/edit`);
    }
  });

  router.post('/:id/delete', idParam, handleValidationErrors, (req, res) => {
    try {
      const row = db.get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!row) {
        req.flash('error', `${title} not found`);
        return res.redirect(`/${prefix}`);
      }
      if (beforeDelete) {
        const result = beforeDelete(req, row);
        if (result && result.error) {
          req.flash('error', result.error);
          return res.redirect(`/${prefix}`);
        }
      }
      db.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      req.flash('success', `${title} deleted successfully`);
      res.redirect(`/${prefix}`);
    } catch (err) {
      logger.error(`Delete ${module} error:`, err);
      req.flash('error', `Failed to delete ${title.toLowerCase()}: ${err.message}`);
      res.redirect(`/${prefix}`);
    }
  });

  router.get('/:id', idParam, handleValidationErrors, (req, res) => {
    try {
      const row = db.get(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!row) {
        req.flash('error', `${title} not found`);
        return res.redirect(`/${prefix}`);
      }
      res.render(`${prefix}/show`, {
        title: row.name || row.subject || row.title || title,
        pageTitle: row.name || row.subject || row.title || title,
        module,
        icon,
        item: mapRow(row),
        columns
      });
    } catch (err) {
      logger.error(`Show ${module} error:`, err);
      req.flash('error', `Failed to load ${title.toLowerCase()}`);
      res.redirect(`/${prefix}`);
    }
  });

  router._config = { table, module, perm, writableFields };
  return router;
}

module.exports = { createResourceRouter, pick, sanitizeConfig };
