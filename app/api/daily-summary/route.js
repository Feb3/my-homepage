export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function fetchNaverNews(query, clientId, clientSecret, display = 10) {
  const res = await fetch(
    `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${display}&sort=date`,
    { headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": clientSecret }, cache: "no-store" }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

async function summarizeWithClaude(items, anthropicKey) {
  if (!anthropicKey || items.length === 0) return items;
  try {
    const prompt = items.map((item, i) =>
      `${i + 1}. 제목: ${item.title}\n내용: ${item.desc}`
    ).join("\n\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `아래 뉴스 ${items.length}건을 각각 3~4문장으로 요약해줘. 핵심 내용, 관련 구역명, 사업 진행 상황, 의미나 영향까지 구체적으로 담아줘. 번호 순서대로, 각 줄에 번호와 요약만 써줘. 예: 1. 요약내용\n\n${prompt}`
        }]
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const lines = text.split("\n").filter((l) => l.trim());
    return items.map((item, i) => {
      const line = lines.find((l) => l.startsWith(`${i + 1}.`));
      const summary = line ? line.replace(/^\d+\.\s*/, "").trim() : item.desc;
      return { ...item, desc: summary };
    });
  } catch { return items; }
}

async function saveSummary(type, items, supabaseUrl, supabaseKey) {
  // 기존 같은 type 삭제 후 새로 저장
  await fetch(`${supabaseUrl}/rest/v1/news_summary?type=eq.${type}`, {
    method: "DELETE",
    headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
  });
  await fetch(`${supabaseUrl}/rest/v1/news_summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ type, items }),
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
    return Response.json({ error: "환경변수 누락" }, { status: 500 });
  }

  // 공공재개발 뉴스
  const publicRaw = await fetchNaverNews("공공재개발", clientId, clientSecret, 20);
  let publicItems = publicRaw.map((item) => ({
    title: item.title.replace(/<[^>]+>/g, ""),
    desc: item.description.replace(/<[^>]+>/g, ""),
    url: item.originallink || item.link,
    source: item.originallink ? new URL(item.originallink).hostname.replace("www.", "") : "뉴스",
    date: new Date(item.pubDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }),
  })).slice(0, 3);
  publicItems = await summarizeWithClaude(publicItems, anthropicKey);
  await saveSummary("public", publicItems, supabaseUrl, supabaseKey);

  // 담당 지구 최신 뉴스
  const DISTRICTS = [
    "수원고색", "광명6구역", "광명3구역", "안양충훈부", "의왕내손",
    "숭인동1169", "시흥4동4", "면목9구역", "성북1구역", "신월5동77",
    "신월7동2", "거여새마을", "창동470", "천호A1-1", "전농9구역",
    "가리봉2-92", "신길1구역", "장위9구역", "상계3구역", "봉천13구역",
    "신설1구역", "도림1구역", "중화5구역"
  ];

  const districtResults = await Promise.all(
    DISTRICTS.map(async (d) => {
      const items = await fetchNaverNews(`${d} 재개발`, clientId, clientSecret, 5);
      return items.filter((item) => item.title.replace(/<[^>]+>/g, "").includes(d));
    })
  );

  const seen = new Set();
  let districtItems = districtResults
    .flat()
    .map((item) => ({
      title: item.title.replace(/<[^>]+>/g, ""),
      desc: item.description.replace(/<[^>]+>/g, ""),
      url: item.originallink || item.link,
      source: item.originallink ? new URL(item.originallink).hostname.replace("www.", "") : "뉴스",
      date: new Date(item.pubDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }),
      pubDate: new Date(item.pubDate).getTime(),
    }))
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, 10);

  districtItems = await summarizeWithClaude(districtItems, anthropicKey);
  await saveSummary("district", districtItems, supabaseUrl, supabaseKey);

  return Response.json({ success: true, public: publicItems.length, district: districtItems.length });
}
