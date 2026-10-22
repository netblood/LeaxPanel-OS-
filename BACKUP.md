# Backup Guide

## Backing Up LeaxPanel

Regular backups are essential for protecting your data. LeaxPanel uses SQLite for all storage, making backups straightforward.

### What to Back Up

| Item | Location | Frequency |
| --- | --- | --- |
| **Database** | `data/leaxos.db` | Daily / Before upgrades |
| **Uploads/Files** | `data/uploads/` | Weekly / After major changes |
| **Application Data** | `data/` | Before migrations |
| **Backups** | `backups/` | Keep off-site |
| **Logs** | `logs/` | As needed |

### Backup Commands

#### Manual Backup

```bash
# Create a timestamped backup of the database
cp data/leaxos.db backups/leaxos-$(date +%Y%m%d-%H%M%S).db

# Create a backup of all data
mkdir -p backups/full-$(date +%Y%m%d-%H%M%S)
cp -r data/leaxos.db backups/full-$(date +%Y%m%d-%H%M%S)/database.db
cp -r data/uploads/ backups/full-$(date +%Y%m%d-%H%M%S)/uploads/
cp -r logs/ backups/full-$(date +%Y%m%d-%H%M%S)/logs/
```

#### Automated Backup (via Panel)

Use the **Backups** section in the dashboard to:
- Create on-demand backups
- Schedule automatic backups
- Download backups
- Restore from backups

### Restoring from Backup

#### Database Restore

```bash
# Stop the server first (recommended)
npm stop

# Restore from backup
cp backups/leaxos-20240101.db data/leaxos.db

# Start the server
npm start
```

#### Full Restore

```bash
# Extract backup
tar -xzf backups/full-20240101.tar.gz -C /tmp/restore

# Copy files to correct locations
cp /tmp/restore/database.db data/leaxos.db
cp -r /tmp/restore/uploads/ data/uploads/
cp -r /tmp/restore/logs/ logs/
```

### Backup Best Practices

1. **Store backups off-site** - Use cloud storage (S3, Google Drive, etc.) or send to another server
2. **Test restores regularly** - Verify backups are not corrupted by restoring to a test environment
3. **Keep multiple versions** - Maintain at least 3-5 recent backups
4. **Backup before upgrades** - Always create a backup before running migrations or upgrading
5. **Monitor backup size** - Large databases may need compression or segmentation

### Backup Retention Policy

- **Daily backups**: Keep 7 days
- **Weekly backups**: Keep 4 weeks
- **Monthly backups**: Keep 12 months

### Encryption

For sensitive data, encrypt backups before storing:

```bash
# Encrypt backup with OpenSSL
openssl enc -aes-256-cbc -salt -in data/leaxos.db -out backups/leaxos-encrypted-$(date +%Y%m.db).enc

# Decrypt when needed
openssl enc -d -aes-256-cbc -in backups/leaxos-encrypted-20240101.db.enc -out data/leaxos.db
```

### Cloud Backup Integration

LeaxPanel can integrate with cloud storage for automated backups:

1. Configure cloud credentials in `.env`
2. Enable backup automation in the dashboard
3. Backups will be automatically uploaded to your cloud storage

Supported cloud storage providers:
- Amazon S3
- Google Cloud Storage
- Microsoft Azure Blob Storage
- DigitalOcean Spaces

---

## Backup Troubleshooting

| Issue | Solution |
| --- | --- |
| `Permission denied` | Run as user with write access to `data/` and `backups/` directories |
| `Disk space full` | Clean old backups or move to separate storage |
| `Backup file too large` | Compress with gzip or zip, or exclude large upload files |
| `Restore fails` | Verify backup integrity before restoring; check SQLite version compatibility |

---

## Backup API

The REST API includes backup endpoints:

```bash
# Create a backup via API
curl -X POST http://localhost:3000/api/backups/create

# List backups
curl http://localhost:3000/api/backups/list

# Download a backup
curl -O http://localhost:3000/api/backups/download/:filename

# Restore a backup
curl -X POST http://localhost:3000/api/backups/restore/:filename
```

See [API.md](API.md) for full documentation.