'use strict';

/**
 * AstroLink CyberShield — defensive traffic management and monitoring.
 *
 * Extends the Stage 1 security foundation (helmet, CORS allowlist, rate limits,
 * body-size limits, validation) with:
 *   - request metrics (total / success / failed / rate-limited / suspicious)
 *   - multi-signal abuse detection (never blocks on a single signal)
 *   - progressive, auto-expiring temporary restrictions (reversible by an admin)
 *   - a sanitized, access-controlled audit log
 *
 * This runs in-process with no external dependency (no Redis required). It is a
 * defensive control, not a claim of "advanced bot detection".
 */

const crypto = require('crypto');

const nowMs = () => Date.now();

class CyberShield {
  constructor(options = {}) {
    this.windowMs = Number(options.windowMs ?? process.env.ABUSE_WINDOW_MS ?? 5 * 60 * 1000);
    this.rateThreshold = Number(options.rateThreshold ?? process.env.ABUSE_RATE_THRESHOLD ?? 90);
    this.invalidThreshold = Number(options.invalidThreshold ?? process.env.ABUSE_INVALID_THRESHOLD ?? 12);
    this.pathThreshold = Number(options.pathThreshold ?? process.env.ABUSE_PATH_THRESHOLD ?? 8);
    this.signalsRequired = Number(options.signalsRequired ?? process.env.ABUSE_SIGNALS_REQUIRED ?? 2);

    // Progressive, capped and auto-expiring restriction durations (seconds).
    this.restrictionSteps = (options.restrictionSteps ?? process.env.ABUSE_RESTRICTION_STEPS ?? '15,30,60,120,300')
      .toString()
      .split(',')
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);

    this.maxEvents = Number(options.maxEvents ?? 250);
    this.trustedIps = new Set(
      String(options.trustedIps ?? process.env.TRUSTED_IPS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );
    this.adminToken = options.adminToken ?? process.env.ADMIN_TOKEN ?? '';
    this.clock = options.clock || nowMs;

    this.clients = new Map(); // ip -> { events: [], strikes, restrictedUntil, reason }
    this.restrictions = new Map(); // ip -> { until, reason, strikes, createdAt }
    this.audit = []; // sanitized ring buffer
    this.metrics = {
      startedAt: new Date().toISOString(),
      total: 0,
      success: 0,
      failed: 0,
      rateLimited: 0,
      suspicious: 0,
      currentlyRestricted: 0,
      byStatus: {},
      latency: { count: 0, sum: 0, max: 0, samples: [] },
      providerFailures: 0,
    };
  }

  // -- helpers ---------------------------------------------------------------
  isTrusted(ip) {
    return this.trustedIps.has(ip);
  }

  clientIp(req) {
    return (req.ip || req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
  }

  activeRestriction(ip) {
    const entry = this.restrictions.get(ip);
    if (!entry) return null;
    if (entry.until <= this.clock()) {
      this.restrictions.delete(ip);
      return null;
    }
    return entry;
  }

  // -- audit log (sanitized) ---------------------------------------------------
  recordEvent(type, fields = {}) {
    const event = {
      ts: new Date(this.clock()).toISOString(),
      type,
      ...fields,
    };
    this.audit.push(event);
    if (this.audit.length > this.maxEvents) this.audit.shift();
    return event;
  }

  // Sanitize a path so no query values (which could hold tokens) are stored.
  static sanitizePath(url) {
    const raw = String(url || '');
    const pathOnly = raw.split('?')[0];
    return pathOnly.replace(/(api_key=|key=|token=)[^&/]+/gi, '$1***');
  }

  // -- metric recording --------------------------------------------------------
  observe(req, res, latencyMs) {
    const ip = this.clientIp(req);
    const status = res.statusCode;
    this.metrics.total += 1;
    this.metrics.byStatus[status] = (this.metrics.byStatus[status] || 0) + 1;
    if (status < 400) this.metrics.success += 1;
    else this.metrics.failed += 1;
    if (status === 429) this.metrics.rateLimited += 1;

    const latency = this.metrics.latency;
    latency.count += 1;
    latency.sum += latencyMs;
    latency.max = Math.max(latency.max, latencyMs);
    latency.samples.push(latencyMs);
    if (latency.samples.length > 200) latency.samples.shift();

    if (this.isTrusted(ip)) return;

    const client = this.clients.get(ip) || { events: [], strikes: 0 };
    client.events.push({ t: this.clock(), status, path: CyberShield.sanitizePath(req.originalUrl || req.url) });
    const cutoff = this.clock() - this.windowMs;
    client.events = client.events.filter((e) => e.t >= cutoff);
    this.clients.set(ip, client);

    this.evaluate(ip, client);
  }

  evaluate(ip, client) {
    const events = client.events;
    const requestCount = events.length;
    const invalidCount = events.filter((e) => e.status >= 400 && e.status !== 429).length;
    const distinctPaths = new Set(events.map((e) => e.path)).size;

    // Each signal is independent; a single signal never triggers a restriction.
    const signals = [];
    if (requestCount >= this.rateThreshold) signals.push(`high-rate(${requestCount})`);
    if (invalidCount >= this.invalidThreshold) signals.push(`repeated-invalid(${invalidCount})`);
    if (distinctPaths >= this.pathThreshold) signals.push(`endpoint-scan(${distinctPaths})`);

    if (signals.length < this.signalsRequired) return;

    client.strikes += 1;
    this.metrics.suspicious += 1;
    const stepIndex = Math.min(client.strikes - 1, this.restrictionSteps.length - 1);
    const seconds = this.restrictionSteps[stepIndex] || 0;
    const reason = signals.join(', ');
    const until = this.clock() + seconds * 1000;
    this.restrictions.set(ip, { until, reason, strikes: client.strikes, createdAt: new Date(this.clock()).toISOString() });
    this.metrics.currentlyRestricted = this.restrictions.size;
    this.recordEvent('temporary-restriction', { ip, seconds, reason, strikes: client.strikes });
  }

  // Called by the rate-limit handler so 429s feed the same detection pipeline.
  recordRateLimited(req) {
    const ip = this.clientIp(req);
    this.recordEvent('rate-limited', { ip, path: CyberShield.sanitizePath(req.originalUrl || req.url) });
  }

  recordProviderFailure(providerId) {
    this.metrics.providerFailures += 1;
    this.recordEvent('provider-failure', { provider: providerId });
  }

  // -- middleware --------------------------------------------------------------
  middleware() {
    return (req, res, next) => {
      const ip = this.clientIp(req);
      const path = req.path || '';

      // Health checks and trusted monitoring traffic are always allowed.
      if (path === '/health' || this.isTrusted(ip)) {
        const startedAt = this.clock();
        res.on('finish', () => this.observe(req, res, this.clock() - startedAt));
        return next();
      }

      const restriction = this.activeRestriction(ip);
      if (restriction) {
        const retryAfter = Math.ceil((restriction.until - this.clock()) / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: 'Temporarily restricted',
          details: 'Unusual traffic from this client was detected. Access resumes automatically.',
          retryAfterSeconds: retryAfter,
        });
      }

      const startedAt = this.clock();
      res.on('finish', () => this.observe(req, res, this.clock() - startedAt));
      return next();
    };
  }

  /**
   * Admin authorization. Requires ADMIN_TOKEN on the backend and a matching
   * `x-admin-token` header. When ADMIN_TOKEN is unset all admin routes are
   * safely denied (never public by default).
   */
  requireAdmin() {
    return (req, res, next) => {
      if (!this.adminToken) {
        return res.status(403).json({
          error: 'Admin access not configured',
          details: 'Set ADMIN_TOKEN on the backend to enable administrative endpoints.',
        });
      }
      const provided = String(req.get('x-admin-token') || '');
      const a = Buffer.from(provided);
      const b = Buffer.from(this.adminToken);
      const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (!ok) {
        this.recordEvent('admin-denied', { ip: this.clientIp(req), path: CyberShield.sanitizePath(req.originalUrl) });
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return next();
    };
  }

  // -- reporting ---------------------------------------------------------------
  percentile(p) {
    const samples = [...this.metrics.latency.samples].sort((a, b) => a - b);
    if (samples.length === 0) return null;
    const idx = Math.min(samples.length - 1, Math.floor((p / 100) * samples.length));
    return samples[idx];
  }

  getMetrics() {
    const latency = this.metrics.latency;
    return {
      startedAt: this.metrics.startedAt,
      total: this.metrics.total,
      success: this.metrics.success,
      failed: this.metrics.failed,
      rateLimited: this.metrics.rateLimited,
      suspicious: this.metrics.suspicious,
      currentlyRestricted: this.restrictions.size,
      providerFailures: this.metrics.providerFailures,
      byStatus: this.metrics.byStatus,
      latency: {
        avgMs: latency.count > 0 ? Math.round(latency.sum / latency.count) : null,
        maxMs: latency.count > 0 ? latency.max : null,
        p50Ms: this.percentile(50),
        p95Ms: this.percentile(95),
        count: latency.count,
      },
      activeRestrictions: this.listRestrictions().length,
    };
  }

  listRestrictions() {
    const out = [];
    for (const [ip, entry] of this.restrictions.entries()) {
      if (entry.until <= this.clock()) continue;
      out.push({
        ip,
        reason: entry.reason,
        strikes: entry.strikes,
        createdAt: entry.createdAt,
        expiresAt: new Date(entry.until).toISOString(),
        retryAfterSeconds: Math.ceil((entry.until - this.clock()) / 1000),
      });
    }
    return out;
  }

  restrict(ip, seconds, reason = 'manual') {
    const until = this.clock() + Number(seconds) * 1000;
    this.restrictions.set(ip, { until, reason, strikes: 0, createdAt: new Date(this.clock()).toISOString() });
    this.recordEvent('manual-restriction', { ip, seconds: Number(seconds), reason });
    return this.activeRestriction(ip);
  }

  release(ip) {
    const existed = this.restrictions.delete(ip);
    const client = this.clients.get(ip);
    if (client) {
      client.strikes = 0;
      client.events = [];
    }
    if (existed) this.recordEvent('restriction-released', { ip });
    return existed;
  }

  getEvents(limit = 50) {
    const n = Math.max(1, Math.min(Number(limit) || 50, this.maxEvents));
    return this.audit.slice(-n).reverse();
  }
}

module.exports = { CyberShield };
