export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DISTRICTS = [
  { name: "수원고색", aliases: ["수원고색"], query: "수원고색 공공재개발" },
  { name: "광명6구역", aliases: ["광명6구역", "광명 6구역"], query: "광명6구역 공공재개발" },
  { name: "광명3구역", aliases: ["광명3구역", "광명 3구역"], query: "광명3구역 공공재개발" },
  { name: "안양충훈부", aliases: ["안양충훈부"], query: "안양충훈부 공공재개발" },
  { name: "의왕내손", aliases: ["의왕내손", "내손"], query: "의왕내손 공공재개발" },
  { name: "숭인동1169", aliases: ["숭인동1169", "숭인1169"], query: "숭인동1169 공공재개발" },
  { name: "시흥4동4", aliases: ["시흥4동4", "시흥4동"], query: "시흥4동 공공재개발" },
  { name: "면목9구역", aliases: ["면목9구역", "면목 9구역"], query: "면목9구역 공공재개발" },
  { name: "성북1구역", aliases: ["성북1구역", "성북 1구역"], query: "성북1구역 공공재개발" },
  { name: "신월5동77", aliases: ["신월5동77", "신월5동"], query: "신월5동 공공재개발" },
  { name: "신월7동2", aliases: ["신월7동2", "신월7동"], query: "신월7동 공공재개발" },
  { name: "거여새마을", aliases: ["거여새마을", "거여"], query: "거여새마을 공공재개발" },
  { name: "창동470", aliases: ["창동470", "창동 470"], query: "창동470 공공재개발" },
  { name: "천호A1-1", aliases: ["천호A1-1", "천호A1", "천호a1"], query: "천호A1 공공재개발" },
  { name: "전농9구역", aliases: ["전농9구역", "전농 9구역"], query: "전농9구역 공공재개발" },
  { name: "가리봉2-92", aliases: ["가리봉2-92", "가리봉2"], query: "가리봉2 공공재개발" },
  { name: "신길1구역", aliases: ["신길1구역", "신길 1구역"], query: "신길1구역 공공재개발" },
  { name: "장위9구역", aliases: ["장위9구역", "장위 9구역"], query: "장위9구역 공공재개발" },
  { name: "상계3구역", aliases: ["상계3구역", "상계 3구역"], query: "상계3구역 공공재개발" },
  { name: "봉천13구역", aliases: ["봉천13구역", "봉천 13구역"], query: "봉천13구역 공공재개발" },
  { name: "신설1구역", aliases: ["신설1구역", "신설제1", "신설 1구역"], query: "신설1구역 공공재개발" },
  { name: "도림1구역", aliases: ["도림1구역", "도림 1구역"], query: "도림1구역 공공재개발" },
  { name: "중화5구역", aliases: ["중화5구역", "중화 5구역"], query: "중화5구역 공공재개발" },
];

// 네이버 뉴스 검색
async function searchNaver(query, clientId, clientSecret) {
  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=50&sort=date`,
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item) => ({
      title: item.title.replace(/<[^>]+>/g, ""),
      url: item.originallink || item.link,
      pub_date: new Date(item.pubDate).toISOString(),
      source: item.originallink
        ? new URL(item.originallink).hostname.replace("www.", "")
        : "뉴스",
      description: item.description.replace(/<[^>]+>/g, ""),
    }));
  } catch { return []; }
}

// 구글 RSS 검색
async function searchGoogle(query) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const xml = await res.text();

    // XML 파싱
    const items = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatches) {
      const itemXml = match[1];
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        ?? itemXml.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] ?? "";
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
      const source = itemXml.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? "";
      const desc = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        ?? itemXml.match(/<description>(.*?)<\/description>/)?.[1] ?? "";

      if (title && link) {
        items.push({
          title: title.replace(/<[^>]+>/g, "").trim(),
          url: link.trim(),
          pub_date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          source: source.trim() || (link ? new URL(link).hostname.replace("www.", "") : "뉴스"),
          description: desc.replace(/<[^>]+>/g, "").trim(),
        });
      }
    }
    return items;
  } catch { return []; }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
    return Response.json({ error: "환경변수 누락" }, { status: 500 });
  }

  let totalSaved = 0;
  const results = [];

  for (const districtObj of DISTRICTS) {
    try {
      // 네이버 + 구글 동시 검색
      const [naverItems, googleItems] = await Promise.all([
        searchNaver(districtObj.query, clientId, clientSecret),
        searchGoogle(districtObj.query),
      ]);

      // 합치고 중복 URL 제거
      const allItems = [...naverItems, ...googleItems];
      const seen = new Set();
      const merged = allItems.filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      });

      // 지구명 포함 여부 필터링
      const filtered = merged.filter((item) =>
        districtObj.aliases.some((alias) => item.title.includes(alias))
      ).map((item) => ({
        district: districtObj.name,
        title: item.title,
        description: item.description,
        url: item.url,
        source: item.source,
        pub_date: item.pub_date,
      }));

      if (filtered.length > 0) {
        await fetch(`${supabaseUrl}/rest/v1/news_archive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "resolution=ignore-duplicates",
          },
          body: JSON.stringify(filtered),
        });
        totalSaved += filtered.length;
        results.push({ district: districtObj.name, count: filtered.length });
      } else {
        results.push({ district: districtObj.name, count: 0 });
      }
    } catch (e) {
      results.push({ district: districtObj.name, error: e.message });
    }
  }

  return Response.json({ success: true, totalSaved, results });
}