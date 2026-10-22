// Cloudflare Service - API validation, DNS CRUD, SSL via Cloudflare.
// Uses Cloudflare API v4.
const logger = require('../utils/logger');

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

class CloudflareService {
  /**
   * Validate Cloudflare API token and get account/zone info.
   */
  async validateToken(apiToken) {
    try {
      const res = await fetch(`${CF_API_BASE}/user/tokens/verify`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });
      const data = await res.json();
      return data.success ? { success: true, result: data.result } : { success: false, error: data.errors?.[0]?.message || 'Invalid token' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * List zones for the authenticated account.
   */
  async listZones(apiToken) {
    try {
      const res = await fetch(`${CF_API_BASE}/zones`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });
      const data = await res.json();
      return data.success ? { success: true, result: data.result } : { success: false, error: data.errors?.[0]?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get zone details by zone ID.
   */
  async getZone(apiToken, zoneId) {
    try {
      const res = await fetch(`${CF_API_BASE}/zones/${zoneId}`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });
      const data = await res.json();
      return data.success ? { success: true, result: data.result } : { success: false, error: data.errors?.[0]?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * List DNS records for a zone.
   */
  async listRecords(apiToken, zoneId, params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records?${query}`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });
      const data = await res.json();
      return data.success ? { success: true, result: data.result } : { success: false, error: data.errors?.[0]?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Create a DNS record.
   */
  async createRecord(apiToken, zoneId, record) {
    try {
      const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      });
      const data = await res.json();
      return data.success ? { success: true, result: data.result } : { success: false, error: data.errors?.[0]?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Update a DNS record.
   */
  async updateRecord(apiToken, zoneId, recordId, record) {
    try {
      const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      });
      const data = await res.json();
      return data.success ? { success: true, result: data.result } : { success: false, error: data.errors?.[0]?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete a DNS record by name (convenience method).
   */
  async deleteRecord(apiToken, zoneId, recordName) {
    try {
      // First find the record
      const list = await this.listRecords(apiToken, zoneId, { name: recordName });
      if (!list.success || !list.result?.length) {
        return { success: false, error: 'Record not found' };
      }

      const record = list.result[0];
      const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/dns_records/${record.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });
      const data = await res.json();
      return data.success ? { success: true } : { success: false, error: data.errors?.[0]?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get SSL/TLS certificate status for a zone.
   */
  async getSSLCertificateStatus(apiToken, zoneId) {
    try {
      const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/ssl/certificate_packs`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });
      const data = await res.json();
      return data.success ? { success: true, result: data.result } : { success: false, error: data.errors?.[0]?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Enable "Always Use HTTPS" for a zone.
   */
  async enableAlwaysHTTPS(apiToken, zoneId) {
    try {
      const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/settings/always_use_https`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: 'on' })
      });
      const data = await res.json();
      return data.success ? { success: true, result: data.result } : { success: false, error: data.errors?.[0]?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Enable "Automatic HTTPS Rewrites" for a zone.
   */
  async enableAutoHTTPSRewrites(apiToken, zoneId) {
    try {
      const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/settings/automatic_https_rewrites`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: 'on' })
      });
      const data = await res.json();
      return data.success ? { success: true, result: data.result } : { success: false, error: data.errors?.[0]?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get zone analytics (traffic, requests, etc.)
   */
  async getAnalytics(apiToken, zoneId, since = '-24h') {
    try {
      const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/analytics/dashboard?since=${encodeURIComponent(since)}`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });
      const data = await res.json();
      return data.success ? { success: true, result: data.result } : { success: false, error: data.errors?.[0]?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new CloudflareService();