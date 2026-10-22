// Generates the list/create/edit views for every declarative module.
// Run with: node scripts/generate-views.js
const fs = require('fs');
const path = require('path');
const { modules } = require('../config/modules');

const VIEWS = path.join(__dirname, '..', 'views');

const LIST_TEMPLATE = (config) => `<div class="page-header">
  <div>
    <h1 class="page-title"><%= pageTitle %></h1>
    <% if (typeof pageSubtitle !== 'undefined' && pageSubtitle) { %>
      <p class="page-subtitle"><%= pageSubtitle %></p>
    <% } %>
  </div>
  <div class="page-actions">
    <a href="/${config.prefix}/create" class="btn btn-primary">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      New ${config.title.replace(/s$/, '')}
    </a>
  </div>
</div>

<div class="card">
  <% if (typeof loadError !== 'undefined' && loadError) { %>
    <div class="card-body">
      <div class="alert alert-danger"><span class="alert-icon">!</span><div><%= loadError %></div></div>
    </div>
  <% } %>
  <div class="card-body">
    <%- include('../partials/resourceTable'); %>
  </div>
</div>
`;

const FORM_TEMPLATE = (config, mode) => `<div class="page-header">
  <div>
    <h1 class="page-title"><%= pageTitle %></h1>
    <p class="page-subtitle">${mode === 'create' ? `Add a new ${config.title.replace(/s$/, '').toLowerCase()} to your panel.` : `Update the ${config.title.replace(/s$/, '').toLowerCase()} configuration.`}</p>
  </div>
  <div class="page-actions">
    <a href="/${config.prefix}" class="btn btn-ghost">Back to list</a>
  </div>
</div>

<%- include('../partials/resourceForm', {
  fields: fields,
  values: values,
  action: formAction,
  submitLabel: '${mode === 'create' ? `Create ${config.title.replace(/s$/, '')}` : 'Save changes'}',
  cancelHref: '/${config.prefix}',
  module: module
}); %>
`;

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

let created = 0;
for (const config of modules) {
  const dir = path.join(VIEWS, config.viewPrefix || config.prefix);
  writeFile(path.join(dir, 'index.ejs'), LIST_TEMPLATE(config));
  writeFile(path.join(dir, 'create.ejs'), FORM_TEMPLATE(config, 'create'));
  writeFile(path.join(dir, 'edit.ejs'), FORM_TEMPLATE(config, 'edit'));
  created += 3;
}

console.log(`[views] Generated ${created} view files for ${modules.length} modules`);
