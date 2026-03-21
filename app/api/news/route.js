export const revalidate = 3600;

const KEYWORDS = [
  "공공재개발", "수원고색", "광명6구역", "광명3구역", "안양충훈부",
  "의왕내손", "숭인동1169", "시흥4동4", "면목9구역", "성북1구역",
  "신월5동77", "신월7동2", "거여새마을", "창동470", "천호A1-1",
  "전농9구역", "가리봉2-92", "신길1구역", "장위9구역", "상계3구역",
  "봉천13구역", "신설1구역", "도림1구역", "중화5구역"
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
    // 모든 키워드 동시 검색
    const results = await Promise.all(
      KEYWORDS.map((kw) => searchNaver(kw, clientId, clientSecret))
    );

    // 합치고 중복 제거 후 최신순 정렬, 5개만
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