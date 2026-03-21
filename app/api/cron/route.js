export const dynamic = "force-dynamic";

const DISTRICTS = [
  "수원고색", "광명6구역", "광명3구역", "안양충훈부", "의왕내손",
  "숭인동1169", "시흥4동4", "면목9구역", "성북1구역", "신월5동77",
  "신월7동2", "거여새마을", "창동470", "천호A1-1", "전농9구역",
  "가리봉2-92", "신길1구역", "장위9구역", "상계3구역", "봉천13구역",
  "신설1구역", "도림1구역", "중화5구역"
];

export async function GET(request) {
  // Vercel Cron 요청 검증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
    return Response.json({ error: "환경변수 누락" }, { status: 500 });
  }

  let saved = 0;

  for (const district of DISTRICTS) {
    try {
      const res = await fetch(
        `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(district + " 재개발")}&display=10&sort=date`,
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
        await fetch(`${supabaseUrl}/rest/v1/news_archive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "resolution=ignore-duplicates",
          },
          body: JSON.stringify(items),
        });
        saved += items.length;
      }
    } catch (e) {
      console.error(`${district} 오류:`, e.message);
    }
  }

  return Response.json({ success: true, saved });
}