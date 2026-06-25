"use node";

import { v } from 'convex/values';
import { internalAction } from './_generated/server';

export const sendPush = internalAction({
  args: {
    tokens: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.record(v.string(), v.string())),
  },
  returns: v.null(),
  handler: async (_ctx, { tokens, title, body, data }) => {
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        console.error('Failed to send push notification', await response.text());
      }
    }

    return null;
  },
});
