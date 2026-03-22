export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DISTRICTS = [
  "수원고색", "광명6구역", "광명3구역", "안양충훈부", "의왕내손",
  "숭인동1169", "시흥4동4", "면목9구역", "성북1구역", "신월5동77",
  "신월7동2", "거여새마을", "창동470", "천호A1-1", "전농9구역",
  "가리봉2-92", "신길1구역", "장위9구역", "상계3구역", "봉천13구역",
  "신설1구역", "도림1구역", "중화5구역"
];

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

  for (const district of DISTRICTS) {
    try {
      // 네이버 API는 최대 100개까지 가져올 수 있어요
      const res = await fetch(
        `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(district + " 재개발")}&display=100&sort=date`,
        {
          headers: {
            "X-Naver-Client-Id": clientId,
            "X-Naver-Client-Secret": clientSecret,
          },
          cache: "no-store",
        }
      );
      const data = await res.json();
      const items = (data.items || [])
        .filter((item) => item.title.replace(/<[^>]+>/g, "").includes(district))
        .map((item) => ({
          district,
          title: item.title.replace(/<[^>]+>/g, ""),
          description: item.description.replace(/<[^>]+>/g, ""),
          url: item.originallink || item.link,
          source: item.originallink
            ? new URL(item.originallink).hostname.replace("www.", "")
            : "뉴스",
          pub_date: new Date(item.pubDate).toISOString(),
        }));

      if (items.length > 0) {
        const saveRes = await fetch(`${supabaseUrl}/rest/v1/news_archive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "resolution=ignore-duplicates",
          },
          body: JSON.stringify(items),
        });
        totalSaved += items.length;
        results.push({ district, count: items.length });
      }
    } catch (e) {
      results.push({ district, error: e.message });
    }
  }

  return Response.json({ success: true, totalSaved, results });
}