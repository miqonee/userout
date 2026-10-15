import { config } from "../config.js";

class RouterClient {
  constructor() {
    this.authToken = null;
    this.tokenExpiresAt = 0;
    this.cachedModels = null;
    this.modelsCachedAt = 0;
  }

  async login(force = false) {
    if (!force && this.authToken && Date.now() < this.tokenExpiresAt) {
      return this.authToken;
    }

    if (!config.routerPassword) {
      throw new Error("ROUTER_PASSWORD is not configured in .env");
    }

    const url = `${config.routerUrl}/api/auth/login`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: config.routerPassword }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`9router login failed (${res.status}): ${err}`);
    }

    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) {
      throw new Error("9router did not return auth_token cookie");
    }

    const match = setCookie.match(/auth_token=([^;]+)/);
    if (!match) {
      throw new Error("Could not parse auth_token cookie from 9router");
    }

    this.authToken = match[1];
    // Cache for 23 hours
    this.tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
    return this.authToken;
  }

  async authenticatedFetch(endpoint, options = {}, retried = false) {
    const token = await this.login();
    const headers = {
      ...(options.headers || {}),
      Cookie: `auth_token=${token}`,
    };

    const res = await fetch(`${config.routerUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && !retried) {
      await this.login(true);
      return this.authenticatedFetch(endpoint, options, true);
    }

    return res;
  }

  async listKeys() {
    const res = await this.authenticatedFetch("/api/keys", {
      method: "GET",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to list keys from 9router (${res.status}): ${text}`);
    }

    const data = await res.json();
    return data.keys || [];
  }

  async getActiveModels(apiKey = null, forceRefresh = false) {
    if (!forceRefresh && this.cachedModels && Date.now() - this.modelsCachedAt < 60_000) {
      return this.cachedModels;
    }

    let activeKey = apiKey;
    if (!activeKey) {
      const keys = await this.listKeys();
      const firstActive = keys.find((k) => k.isActive && k.key);
      if (firstActive) {
        activeKey = firstActive.key;
      }
    }

    if (!activeKey) {
      // Fallback: query /api/models if no inference key is available
      const res = await this.authenticatedFetch("/api/models");
      if (res.ok) {
        const data = await res.json();
        return (data.models || []).map((m) => ({
          id: m.routedModel || m.fullModel || m.model,
          name: m.name || m.model,
          provider: m.provider,
        }));
      }
      return [];
    }

    const res = await fetch(`${config.routerUrl}/v1/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${activeKey}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch /v1/models (${res.status}): ${text}`);
    }

    const json = await res.json();
    const models = Array.isArray(json.data) ? json.data : [];
    this.cachedModels = models;
    this.modelsCachedAt = Date.now();
    return models;
  }

  async createKey({ name, tokenLimit = 0, allowedModels = null }) {
    const res = await this.authenticatedFetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        tokenLimit: Number(tokenLimit) || 0,
        allowedModels: Array.isArray(allowedModels) && allowedModels.length > 0 ? allowedModels : null,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to create key in 9router (${res.status}): ${text}`);
    }

    return await res.json();
  }

  async getKey(keyId) {
    const res = await this.authenticatedFetch(`/api/keys/${keyId}`, {
      method: "GET",
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      const text = await res.text();
      throw new Error(`Failed to get key ${keyId} from 9router (${res.status}): ${text}`);
    }

    const data = await res.json();
    return data.key;
  }

  async updateKey(keyId, updateData) {
    const res = await this.authenticatedFetch(`/api/keys/${keyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to update key ${keyId} in 9router (${res.status}): ${text}`);
    }

    const data = await res.json();
    return data.key;
  }

  async deleteKey(keyId) {
    const res = await this.authenticatedFetch(`/api/keys/${keyId}`, {
      method: "DELETE",
    });

    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`Failed to delete key ${keyId} in 9router (${res.status}): ${text}`);
    }

    return true;
  }
}

export const routerClient = new RouterClient();
