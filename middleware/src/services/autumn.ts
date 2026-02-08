/**
 * useautumn.com integration — credit checking and usage tracking.
 */

import axios, { AxiosInstance } from "axios";

const AUTUMN_BASE_URL = "https://api.useautumn.com/v1";

class AutumnService {
  private enabled: boolean;
  private client: AxiosInstance | null = null;

  constructor() {
    this.enabled = false;
  }

  initialize() {
    const key = process.env.AUTUMN_SECRET_KEY || "";
    const enabled = process.env.AUTUMN_ENABLED === "true";

    if (enabled && key) {
      this.enabled = true;
      this.client = axios.create({
        baseURL: AUTUMN_BASE_URL,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      });
      console.log("Autumn credit service enabled");
    } else {
      this.enabled = false;
      console.log("Autumn credit service disabled (no API key configured)");
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  async checkCredits(
    customerId: string,
    featureId: string = "detections"
  ): Promise<{ allowed: boolean; balance: number | null }> {
    if (!this.enabled || !this.client) {
      return { allowed: true, balance: null };
    }
    try {
      const res = await this.client.get("/entitled", {
        params: { customer_id: customerId, feature_id: featureId },
      });
      return {
        allowed: res.data.allowed ?? false,
        balance: res.data.balance ?? null,
      };
    } catch (err) {
      console.error("Autumn check credits error:", err);
      return { allowed: true, balance: null };
    }
  }

  async trackUsage(
    customerId: string,
    featureId: string = "detections",
    delta: number = 1
  ): Promise<boolean> {
    if (!this.enabled || !this.client) return true;
    try {
      await this.client.post("/events", {
        customer_id: customerId,
        feature_id: featureId,
        delta,
      });
      return true;
    } catch (err) {
      console.error("Autumn track usage error:", err);
      return false;
    }
  }

  async getCustomerInfo(customerId: string): Promise<any | null> {
    if (!this.enabled || !this.client) return null;
    try {
      const res = await this.client.get(`/customers/${customerId}`);
      return res.data;
    } catch (err) {
      console.error("Autumn customer info error:", err);
      return null;
    }
  }

  async createCheckout(
    customerId: string,
    productId: string
  ): Promise<string | null> {
    if (!this.enabled || !this.client) return null;
    try {
      const res = await this.client.post("/attach", {
        customer_id: customerId,
        product_id: productId,
      });
      return res.data.url ?? null;
    } catch (err) {
      console.error("Autumn checkout error:", err);
      return null;
    }
  }
}

export const autumnService = new AutumnService();
