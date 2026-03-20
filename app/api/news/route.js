export const revalidate = 3600; // 1시간마다 자동 갱신

export async function GET() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.json({ error: "API 키가 설정되지 않았습니다" }, { status: 500 });
  }

  try {
    const res = await fetch(
      "https://openapi.naver.com/v1/search/news.json?query=공공재개발&display=5&sort=date",
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
        next: { revalidate: 3600 },
      }
    );
    const data = await res.json();

    const news = data.items.map((item) => ({
      title: item.title.replace(/<[^>]+>/g, ""),
      desc: item.description.replace(/<[^>]+>/g, ""),
      url: item.originallink || item.link,
      source: item.originallink
        ? new URL(item.originallink).hostname.replace("www.", "")
        : "뉴스",
      date: new Date(item.pubDate).toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric",
      }),
    }));

    return Response.json({ news });
  } catch (e) {
    return Response.json({ error: "뉴스를 불러올 수 없습니다" }, { status: 500 });
  }
}
