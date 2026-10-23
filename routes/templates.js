// Template Marketplace Routes
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');
const templates = require('../templates');
const logger = require('../utils/logger');

// All routes require auth and marketplace permission
router.use(authMiddleware.requireAuth);
router.use(rbacMiddleware.checkPermission('marketplace:view'));

// List all templates (marketplace view)
router.get('/', (req, res) => {
  try {
    const allTemplates = templates.listTemplates();
    
    // Add marketplace metadata (ratings, downloads, etc.)
    const marketplaceItems = allTemplates.map(t => {
      // In production, fetch from marketplace table
      const row = db.get('SELECT * FROM marketplace_items WHERE template_id = ?', [t.id]);
      return {
        ...t,
        rating: row?.rating || 0,
        reviews: row?.reviews || 0,
        downloads: row?.downloads || 0,
        popularity: row?.popularity || 0,
        trustScore: row?.trust_score || 0,
        verified: row?.verified || false,
        official: row?.official || false,
        version: row?.version || '1.0.0',
        updatedAt: row?.updated_at || null,
        category: getCategory(t.id)
      };
    });
    
    res.render('marketplace/index', {
      title: 'Template Marketplace',
      pageTitle: 'Template Marketplace',
      templates: marketplaceItems,
      user: req.session.user
    });
  } catch (err) {
    logger.error('Marketplace index error:', err);
    res.status(500).render('errors/500', { errorMessage: 'Failed to load marketplace' });
  }
});

// Template preview page
router.get('/:id/preview', (req, res) => {
  try {
    const template = templates.getTemplate(req.params.id);
    
    if (!template) {
      return res.status(404).render('errors/404', { title: 'Template Not Found' });
    }
    
    const row = db.get('SELECT * FROM marketplace_items WHERE template_id = ?', [req.params.id]);
    
    res.render('marketplace/preview', {
      title: `Preview: ${template.name}`,
      pageTitle: `Preview: ${template.name}`,
      template: {
        ...template,
        rating: row?.rating || 0,
        reviews: row?.reviews || 0,
        downloads: row?.downloads || 0,
        verified: row?.verified || false,
        official: row?.official || false,
        version: row?.version || '1.0.0',
        category: getCategory(req.params.id)
      },
      user: req.session.user
    });
  } catch (err) {
    logger.error('Template preview error:', err);
    res.status(500).render('errors/500', { errorMessage: 'Failed to load preview' });
  }
});

// Deploy template
router.post('/:id/deploy', async (req, res) => {
  try {
    const template = templates.getTemplate(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const { name, domain, envVars, workspaceId } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Deployment name is required' });
    }
    
    // Create service record based on template type
    const serviceType = getServiceType(req.params.id);
    const table = getTableForType(serviceType);
    
    if (!table) {
      return res.status(400).json({ error: 'Unsupported template type' });
    }
    
    const result = db.run(
      `INSERT INTO ${table} (name, type, status, config, created_at) VALUES (?, ?, 'pending', ?, datetime('now'))`,
      [name, serviceType, JSON.stringify({ template: req.params.id, envVars: envVars || {} })]
    );
    
    // Trigger provisioning
    const serviceProvisioner = require('../services/serviceProvisioner');
    const panelSettings = require('../services/panelSettingsService');
    const platformDomain = panelSettings.get('platform_domain');
    
    if (platformDomain) {
      await serviceProvisioner.provision(serviceType, String(result.lastInsertRowid), name, req.user.id, {
        template: req.params.id,
        envVars: envVars || {},
        domain: domain || `${name}.${platformDomain}`
      });
    }
    
    // Increment download count
    db.run(
      `INSERT OR REPLACE INTO marketplace_items (template_id, downloads) VALUES (?, COALESCE((SELECT downloads FROM marketplace_items WHERE template_id = ?), 0) + 1)`,
      [req.params.id, req.params.id]
    );
    
    res.json({ 
      success: true, 
      id: result.lastInsertRowid, 
      redirect: `/${serviceType}/${result.lastInsertRowid}` 
    });
  } catch (err) {
    logger.error('Template deploy error:', err);
    res.status(500).json({ error: 'Deployment failed' });
  }
});

// Rate/Review template
router.post('/:id/review', (req, res) => {
  try {
    const { rating, review } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }
    
    // Check if user already reviewed
    const existing = db.get(
      'SELECT * FROM marketplace_reviews WHERE template_id = ? AND user_id = ?',
      [req.params.id, req.session.user.id]
    );
    
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this template' });
    }
    
    db.run(
      `INSERT INTO marketplace_reviews (template_id, user_id, rating, review, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      [req.params.id, req.session.user.id, rating, review || '']
    );
    
    // Update aggregate rating
    const stats = db.get(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM marketplace_reviews WHERE template_id = ?',
      [req.params.id]
    );
    
    db.run(
      `INSERT OR REPLACE INTO marketplace_items (template_id, rating, reviews) VALUES (?, ?, ?)`,
      [req.params.id, stats.avg_rating, stats.count]
    );
    
    res.json({ success: true });
  } catch (err) {
    logger.error('Template review error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Get template reviews
router.get('/:id/reviews', (req, res) => {
  try {
    const reviews = db.all(
      `SELECT mr.*, u.name as user_name FROM marketplace_reviews mr 
       JOIN users u ON mr.user_id = u.id 
       WHERE mr.template_id = ? ORDER BY mr.created_at DESC`,
      [req.params.id]
    );
    
    res.json({ reviews });
  } catch (err) {
    logger.error('Template reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Blueprints (multi-service deployments)
router.get('/blueprints', (req, res) => {
  try {
    const blueprints = db.all('SELECT * FROM marketplace_blueprints ORDER BY created_at DESC');
    
    res.render('marketplace/blueprints', {
      title: 'Blueprints',
      pageTitle: 'Deployment Blueprints',
      blueprints,
      user: req.session.user
    });
  } catch (err) {
    logger.error('Blueprints error:', err);
    res.status(500).render('errors/500', { errorMessage: 'Failed to load blueprints' });
  }
});

router.get('/blueprints/:id', (req, res) => {
  try {
    const blueprint = db.get('SELECT * FROM marketplace_blueprints WHERE id = ?', [req.params.id]);
    
    if (!blueprint) {
      return res.status(404).render('errors/404', { title: 'Blueprint Not Found' });
    }
    
    const services = JSON.parse(blueprint.services || '[]');
    
    res.render('marketplace/blueprint-preview', {
      title: `Blueprint: ${blueprint.name}`,
      pageTitle: `Blueprint: ${blueprint.name}`,
      blueprint,
      services,
      user: req.session.user
    });
  } catch (err) {
    logger.error('Blueprint preview error:', err);
    res.status(500).render('errors/500', { errorMessage: 'Failed to load blueprint' });
  }
});

router.post('/blueprints/:id/deploy', async (req, res) => {
  try {
    const blueprint = db.get('SELECT * FROM marketplace_blueprints WHERE id = ?', [req.params.id]);
    
    if (!blueprint) {
      return res.status(404).json({ error: 'Blueprint not found' });
    }
    
    const services = JSON.parse(blueprint.services || '[]');
    const workspaceId = req.body.workspaceId || req.session.workspace?.id;
    const results = [];
    
    for (const service of services) {
      const template = templates.getTemplate(service.template);
      if (!template) continue;
      
      const table = getTableForType(service.type);
      if (!table) continue;
      
      const result = db.run(
        `INSERT INTO ${table} (name, type, status, config, workspace_id, created_at) VALUES (?, ?, 'pending', ?, ?, datetime('now'))`,
        [
          service.name || template.name,
          service.type,
          JSON.stringify({ template: service.template, envVars: service.envVars || {} }),
          workspaceId
        ]
      );
      
      results.push({ id: result.lastInsertRowid, type: service.type, name: service.name });
      
      // Trigger provisioning
      const serviceProvisioner = require('../services/serviceProvisioner');
      const panelSettings = require('../services/panelSettingsService');
      const platformDomain = panelSettings.get('platform_domain');
      
      if (platformDomain) {
        await serviceProvisioner.provision(service.type, String(result.lastInsertRowid), service.name, req.user.id, {
          template: service.template,
          envVars: service.envVars || {},
          domain: `${service.name}.${platformDomain}`
        });
      }
    }
    
    res.json({ success: true, deployed: results });
  } catch (err) {
    logger.error('Blueprint deploy error:', err);
    res.status(500).json({ error: 'Blueprint deployment failed' });
  }
});

function getCategory(templateId) {
  if (templateId.includes('html') || templateId.includes('static')) return 'Websites';
  if (templateId.includes('nodejs') || templateId.includes('express') || templateId.includes('nestjs') || templateId.includes('fastify') || templateId.includes('go') || templateId.includes('python') || templateId.includes('php') || templateId.includes('laravel') || templateId.includes('docker')) return 'Applications';
  if (templateId.includes('discord') || templateId.includes('telegram') || templateId.includes('whatsapp') || templateId.includes('slack')) return 'Bots';
  if (templateId.includes('agent')) return 'AI Agents';
  if (templateId.includes('n8n')) return 'Workflows';
  if (templateId.includes('postgresql') || templateId.includes('mysql') || templateId.includes('mongodb') || templateId.includes('redis') || templateId.includes('sqlite')) return 'Databases';
  if (templateId.includes('email')) return 'Email';
  if (templateId.includes('storage')) return 'Storage';
  if (templateId.includes('domain')) return 'Domains';
  if (templateId.includes('wordpress') || templateId.includes('woocommerce')) return 'Websites';
  return 'Other';
}

function getServiceType(templateId) {
  if (templateId.includes('html') || templateId.includes('static')) return 'website';
  if (templateId.includes('nodejs') || templateId.includes('express') || templateId.includes('nestjs') || templateId.includes('fastify') || templateId.includes('go') || templateId.includes('python') || templateId.includes('php') || templateId.includes('laravel') || templateId.includes('docker')) return 'apps';
  if (templateId.includes('discord') || templateId.includes('telegram') || templateId.includes('whatsapp') || templateId.includes('slack')) return 'bots';
  if (templateId.includes('agent')) return 'ai_agents';
  if (templateId.includes('n8n')) return 'n8n_workflows';
  if (templateId.includes('postgresql') || templateId.includes('mysql') || templateId.includes('mongodb') || templateId.includes('redis') || templateId.includes('sqlite')) return 'databases';
  if (templateId.includes('email')) return 'communication';
  if (templateId.includes('storage')) return 'storage';
  if (templateId.includes('domain')) return 'domains';
  if (templateId.includes('wordpress') || templateId.includes('woocommerce')) return 'website';
  return 'apps';
}

function getTableForType(serviceType) {
  const tables = {
    'apps': 'apps',
    'website': 'websites',
    'databases': 'databases',
    'storage': 'storage_buckets',
    'communication': 'communication_channels',
    'bots': 'bots',
    'ai_agents': 'ai_agents',
    'n8n_workflows': 'n8n_workflows',
    'domains': 'domains'
  };
  return tables[serviceType];
}

module.exports = router;