import { createClient } from "@vercel/postgres";

export async function query(text: string, params?: any[]) {
  const client = createClient();
  await client.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    await client.end();
  }
}