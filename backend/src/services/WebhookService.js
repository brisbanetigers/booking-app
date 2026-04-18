export class WebhookService {
  constructor() {
    this.webhookUrl = process.env.PABBLY_WEBHOOK_URL;
    
    if (!this.webhookUrl) {
      console.warn('Webhook delivery is disabled. Missing PABBLY_WEBHOOK_URL config.');
    }
  }

  async emitEvent(eventType, payload) {
    if (!this.webhookUrl) return;

    try {
      // Append a timestamp and the explicit event type so Pabbly routing paths work easily
      const dataPacket = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataPacket)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`Webhook Event [${eventType}] successfully emitted to Pabbly.`);
    } catch (error) {
      // We explicitly catch and log so if Pabbly is down, it does NOT crash the user booking!
      console.error(`Failed to emit Webhook Event [${eventType}]:`, error.message);
    }
  }
}

export const webhookService = new WebhookService();
