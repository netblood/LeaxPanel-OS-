# Upgrade Guide

## Upgrading LeaxPanel

To upgrade LeaxPanel to a newer version, follow these steps:

### Before Upgrading

1. **Backup your data**

   ```bash
   cp data/leaxos.db data/backups/pre-upgrade-$(date +%Y%m%d).db
   ```

2. **Commit any local changes**

   ```bash
   git add .
   git commit -m "Local changes before upgrade"
   ```

3. **Pull the latest code**

   ```bash
   git pull
   ```

### Upgrade Steps

1. **Run database migrations**

   ```bash
   npm run migrate
   # Or: node scripts/bootstrap.js --migrate
   ```

   The migration system is idempotent - it will only apply new migrations.

2. **Re-seed if role/permission changes**

   ```bash
   npm run seed
   # Or: node scripts/bootstrap.js --seed
   ```

   If no schema changes are needed, seeding is idempotent and won't duplicate entries.

3. **Restart the server**

   ```bash
   npm start
   # Or: pm2 restart leaxpanel
   # Or: node server.js
   ```

### What's New

Check the changelog or GitHub releases for details on new features, bug fixes, and breaking changes.

### Rolling Back

If something goes wrong:

```bash
# Restore from backup
cp data/backups/pre-upgrade-20240101.db data/leaxos.db

# Restart
npm start
```

---

## Version Matrix

| Version | Date | Notes |
| --- | --- | --- |
| 1.0.0 | Initial release | SQLite migrations, admin seed, dashboard v1 |
| 1.1.0 | upcoming | New app shell, service cards, wizards |
| 1.2.0 | upcoming | Auto setup, SSL generation, enhanced doctor |

---

## Compatibility Notes

- **SQLite migrations** are backward-compatible within the 1.x series
- **Role/permission changes** require re-seeding: `npm run seed`
- **Database schema changes** are tracked in `schema_migrations` table
- **CSS/JS changes** are backward-compatible (feature flags available)
- **API changes** are documented in each release

---

## Frequently Asked Questions

### Q: Do I lose my data when upgrading?
A: No, your data (websites, apps, bots, configurations) is stored in SQLite and preserved. Only the schema may change.

### Q: Do I need to re-enter my admin credentials?
A: No, the administrator account is preserved. If you change the password or email, update `.env`.

### Q: What if a migration fails?
A: The migration system is idempotent. If a migration fails, it will not be re-applied automatically. Check the migration file and fix any issues, then re-run `npm run migrate`.

### Q: Can I upgrade from an old version directly to the latest?
A: Yes, migrations are cumulative. Just run `npm run migrate` once and it will apply all needed migrations.

---

## Security Upgrades

For security-related upgrades:

1. **Update bcrypt cost** - If changing password hashing cost, re-hash existing passwords via the admin panel
2. **Rotate secrets** - Generate new `SESSION_SECRET` and `JWT_SECRET` after upgrading
3. **Update CSP** - Review and update Content Security Policy if needed
4. **Run doctor** - After upgrading, run `http://localhost:3000/doctor` to verify everything is healthy

---

## Changelog

See the GitHub repository for the full changelog:
<https://github.com/netblood/LeaxPanel-OS-/releases>