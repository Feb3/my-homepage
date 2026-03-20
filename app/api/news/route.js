export const revalidate = 3600;

export async function GET() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.json({ error: "API 키 없음", news: [] }, { status: 200 });
  }

  try {
    const res = await fetch(
      "https://openapi.naver.com/v1/search/news.json?query=%EA%B3%B5%EA%B3%B5%EC%9E%AC%EA%B0%9C%EB%B0%9C&display=5&sort=date",
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: errText, news: [] }, { status: 200 });
    }

    const data = await res.json();
    const news = data.items.map((item) => ({
      title: item.title.replace(/<[^>]+>/g, ""),
      desc: item.description.replace(/<[^>]+>/g, ""),
      url: item.originallink || item.link,
      source: item.originallink
        ? new URL(item.originallink).hostname.replace("www.", "")
        : "뉴스",
      date: new Date(item.pubDate).toLocaleDateString("ko-KR", {
        month: "long", day: "numeric",
      }),
    }));

    return Response.json({ news });
  } catch (e) {
    return Response.json({ error: e.message, news: [] }, { status: 200 });
  }
}
