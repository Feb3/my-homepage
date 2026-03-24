export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DISTRICTS = [
  "수원고색", "광명6구역", "광명3구역", "안양충훈부", "의왕내손",
  "숭인동1169", "시흥4동4", "면목9구역", "성북1구역", "신월5동77",
  "신월7동2", "거여새마을", "창동470", "천호A1-1", "전농9구역",
  "가리봉2-92", "신길1구역", "장위9구역", "상계3구역", "봉천13구역",
  "신설1구역", "도림1구역", "중화5구역"
];

async function fetchNaverNews(query, clientId, clientSecret, display = 10) {
  const res = await fetch(
    `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${display}&sort=date`,
    { headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": clientSecret }, cache: "no-store" }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

async function callClaude(prompt, anthropicKey, maxTokens = 200) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }]
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function filterPublicNews(items, anthropicKey) {
  if (!anthropicKey || items.length === 0) return items;
  try {
    const titles = items.map((item, i) => `${i + 1}. ${item.title}`).join("\n");
    const answer = await callClaude(
      `아래 뉴스 목록에서 아래 조건을 모두 만족하는 번호만 쉼표로 답해줘. 조건에 맞지 않으면 과감하게 제외해. 없으면 반드시 "없음"이라고만 답해.\n\n[포함 조건]\n- 제목에 "공공재개발"이라는 단어가 직접 포함되거나\n- LH 또는 SH가 시행하는 재개발 사업 관련이거나\n- 공공재개발 정책 변화 관련 (국토부, 서울시 정책)\n\n[제외 조건]\n- 공공임대, 분양가상한제, 노후계획도시, 재건축, GTX, 뉴타운\n- 민간 재개발 단독 뉴스\n- 지방(서울·수도권 외) 사업 단독 뉴스\n- 선거, 정치, 인물 관련\n- 공공재개발과 직접 관련 없는 부동산 일반 뉴스\n\n번호만 쉼표로 답해줘. 예: 3, 7, 12\n\n${titles}`,  anthropicKey, 100
    );
    if (answer.includes("없음")) return [];
    const indices = answer.match(/\d+/g)?.map((n) => parseInt(n) - 1).filter((i) => i >= 0 && i < items.length) ?? [];
    return indices.length > 0 ? indices.map((i) => items[i]) : [];
  } catch { return items; }
}

async function summarizeNews(items, anthropicKey) {
  if (!anthropicKey || items.length === 0) return items;
  try {
    const prompt = items.map((item, i) =>
      `${i + 1}. 제목: ${item.title}\n내용: ${item.desc}`
    ).join("\n\n");

    const text = await callClaude(
      `아래 뉴스 ${items.length}건을 각각 3~4문장으로 요약해줘. 핵심 내용, 관련 구역명, 사업 진행 상황, 의미나 영향까지 구체적으로 담아줘. 번호 순서대로, 각 줄에 번호와 요약만 써줘. 예: 1. 요약내용\n\n${prompt}`,
      anthropicKey, 1500
    );

    const lines = text.split("\n").filter((l) => l.trim());
    return items.map((item, i) => {
      const line = lines.find((l) => l.startsWith(`${i + 1}.`));
      const summary = line ? line.replace(/^\d+\.\s*/, "").trim() : item.desc;
      return { ...item, desc: summary };
    });
  } catch { return items; }
}

async function saveSummary(type, items, supabaseUrl, supabaseKey) {
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

  // ① 공공재개발 뉴스 — 필터링 + 요약
  const publicRaw = await fetchNaverNews("공공재개발", clientId, clientSecret, 20);
  const publicFormatted = publicRaw.map((item) => ({
    title: item.title.replace(/<[^>]+>/g, ""),
    desc: item.description.replace(/<[^>]+>/g, ""),
    url: item.originallink || item.link,
    source: item.originallink ? new URL(item.originallink).hostname.replace("www.", "") : "뉴스",
    date: new Date(item.pubDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }),
  }));

  const publicFiltered = await filterPublicNews(publicFormatted, anthropicKey);
  const publicItems = await summarizeNews(publicFiltered.slice(0, 3), anthropicKey);
  await saveSummary("public", publicItems, supabaseUrl, supabaseKey);

  // ② 담당 지구 최신 뉴스 — 요약
  const districtResults = await Promise.all(
    DISTRICTS.map(async (d) => {
      const items = await fetchNaverNews(`${d} 재개발`, clientId, clientSecret, 5);
      return items.filter((item) => item.title.replace(/<[^>]+>/g, "").includes(d));
    })
  );

  const seen = new Set();
  const districtFormatted = districtResults
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

  const districtItems = await summarizeNews(districtFormatted, anthropicKey);
  await saveSummary("district", districtItems, supabaseUrl, supabaseKey);

  return Response.json({
    success: true,
    public: publicItems.length,
    district: districtItems.length
  });
}
