// Generates the generic detail view for every declarative module.
// Run with: node scripts/generate-show-views.js
const fs = require('fs');
const path = require('path');
const { modules } = require('../config/modules');

const VIEWS = path.join(__dirname, '..', 'views');

const SHOW_TEMPLATE = `<div class="page-header">
  <div>
    <h1 class="page-title"><%= item.name || item.subject || item.key || item.title || pageTitle %></h1>
    <p class="page-subtitle"><%= pageTitle %></p>
  </div>
  <div class="page-actions">
    <a href="/<%= module %>" class="btn btn-ghost">Back to list</a>
    <a href="/<%= module %>/<%= item.id %>/edit" class="btn btn-primary">Edit</a>
  </div>
</div>

<div class="card">
  <div class="card-header">
    <div>
      <h3>Details</h3>
      <p>Record #<%= item.id %></p>
    </div>
  </div>
  <div class="card-body">
    <div class="table-wrap">
      <table class="data-table">
        <tbody>
          <% Object.keys(item || {}).forEach(function(key) { %>
            <% if (key === 'id') return; %>
            <tr>
              <td class="cell-primary" style="width:220px;"><%= key.replace(/_/g, ' ') %></td>
              <td><%= (item[key] === null || item[key] === undefined || item[key] === '') ? '—' : item[key] %></td>
            </tr>
          <% }); %>
        </tbody>
      </table>
    </div>
  </div>
  <div class="card-footer form-actions">
    <form action="/<%= module %>/<%= item.id %>/delete" method="POST" data-confirm="Delete this record? This cannot be undone.">
      <input type="hidden" name="_csrf" value="<%= csrfToken %>">
      <button type="submit" class="btn btn-danger">Delete record</button>
    </form>
  </div>
</div>
`;

let count = 0;
for (const config of modules) {
  const dir = path.join(VIEWS, config.viewPrefix || config.prefix);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'show.ejs'), SHOW_TEMPLATE, 'utf8');
  count++;
}

console.log(`[views] Generated ${count} detail views`);
