export const revalidate = 3600;

const KEYWORDS = [
  "공공재개발",
  "수원고색 공공재개발", "광명6구역 공공재개발", "광명3구역 공공재개발",
  "안양충훈부 공공재개발", "의왕내손 공공재개발", "숭인동1169 공공재개발",
  "시흥4동4 공공재개발", "면목9구역 공공재개발", "성북1구역 공공재개발",
  "신월5동77 공공재개발", "신월7동2 공공재개발", "거여새마을 공공재개발",
  "창동470 공공재개발", "천호A1-1 공공재개발", "전농9구역 공공재개발",
  "가리봉2-92 공공재개발", "신길1구역 공공재개발", "장위9구역 공공재개발",
  "상계3구역 공공재개발", "봉천13구역 공공재개발", "신설1구역 공공재개발",
  "도림1구역 공공재개발", "중화5구역 공공재개발"
];

async function searchNaver(query, clientId, clientSecret) {
  const res = await fetch(
    `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=3&sort=date`,
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
  return data.items || [];
}

function formatItem(item) {
  return {
    title: item.title.replace(/<[^>]+>/g, ""),
    desc: item.description.replace(/<[^>]+>/g, ""),
    url: item.originallink || item.link,
    source: item.originallink
      ? new URL(item.originallink).hostname.replace("www.", "")
      : "뉴스",
    date: new Date(item.pubDate).toLocaleDateString("ko-KR", {
      month: "long", day: "numeric",
    }),
    pubDate: new Date(item.pubDate).getTime(),
  };
}

export async function GET() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.json({ error: "API 키 없음", news: [] }, { status: 200 });
  }

  try {
    const results = await Promise.all(
      KEYWORDS.map((kw) => searchNaver(kw, clientId, clientSecret))
    );

    const seen = new Set();
    const news = results
      .flat()
      .map(formatItem)
      .filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .sort((a, b) => b.pubDate - a.pubDate)
      .slice(0, 5);

    return Response.json({ news });
  } catch (e) {
    return Response.json({ error: e.message, news: [] }, { status: 200 });
  }
}