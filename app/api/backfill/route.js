export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DISTRICTS = [
  { name: "수원고색", aliases: ["수원고색"] },
  { name: "광명6구역", aliases: ["광명6구역", "광명 6구역"] },
  { name: "광명3구역", aliases: ["광명3구역", "광명 3구역"] },
  { name: "안양충훈부", aliases: ["안양충훈부"] },
  { name: "의왕내손", aliases: ["의왕내손", "내손"] },
  { name: "숭인동1169", aliases: ["숭인동1169", "숭인1169"] },
  { name: "시흥4동4", aliases: ["시흥4동4", "시흥4동"] },
  { name: "면목9구역", aliases: ["면목9구역", "면목 9구역"] },
  { name: "성북1구역", aliases: ["성북1구역", "성북 1구역"] },
  { name: "신월5동77", aliases: ["신월5동77", "신월5동"] },
  { name: "신월7동2", aliases: ["신월7동2", "신월7동"] },
  { name: "거여새마을", aliases: ["거여새마을"] },
  { name: "창동470", aliases: ["창동470", "창동 470"] },
  { name: "천호A1-1", aliases: ["천호A1-1", "천호A1", "천호a1"] },
  { name: "전농9구역", aliases: ["전농9구역", "전농 9구역"] },
  { name: "가리봉2-92", aliases: ["가리봉2-92", "가리봉2"] },
  { name: "신길1구역", aliases: ["신길1구역", "신길 1구역"] },
  { name: "장위9구역", aliases: ["장위9구역", "장위 9구역"] },
  { name: "상계3구역", aliases: ["상계3구역", "상계 3구역"] },
  { name: "봉천13구역", aliases: ["봉천13구역", "봉천 13구역"] },
  { name: "신설1구역", aliases: ["신설1구역", "신설제1", "신설 1구역"] },
  { name: "도림1구역", aliases: ["도림1구역", "도림 1구역"] },
  { name: "중화5구역", aliases: ["중화5구역", "중화 5구역"] },
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

  for (const districtObj of DISTRICTS) {
    const district = districtObj.name;
    try {
      const res = await fetch(
        `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(districtObj.aliases[0] + " 재개발")}&display=100&sort=date`,
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
        .filter((item) => {
          const title = item.title.replace(/<[^>]+>/g, "");
          return districtObj.aliases.some((alias) => title.includes(alias));
        })
        .map((item) => ({
          district: districtObj.name,
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
        totalSaved += items.length;
        results.push({ district, count: items.length });
      } else {
        results.push({ district, count: 0 });
      }
    } catch (e) {
      results.push({ district, error: e.message });
    }
  }

  return Response.json({ success: true, totalSaved, results });
}