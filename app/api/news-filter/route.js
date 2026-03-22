export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  
  if (!anthropicKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY 없음" });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 50,
        messages: [{ role: "user", content: "1+1은?" }]
      }),
    });
    const data = await res.json();
    return Response.json({ success: true, response: data });
  } catch (e) {
    return Response.json({ error: e.message });
  }
}