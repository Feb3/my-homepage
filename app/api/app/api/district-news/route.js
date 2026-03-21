export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const district = searchParams.get("district");
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!district || !clientId || !clientSecret) {
    return Response.json({ news: [] });
  }

  try {
    const res = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(district + " 재개발")}&display=10&sort=date`,
      { headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": clientSecret }, cache: "no-store" }
    );
    const data = await res.json();
    const news = (data.items || [])
      .map((item) => ({
        title: item.title.replace(/<[^>]+>/g, ""),
        desc: item.description.replace(/<[^>]+>/g, ""),
        url: item.originallink || item.link,
        source: item.originallink ? new URL(item.originallink).hostname.replace("www.", "") : "뉴스",
        date: new Date(item.pubDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }),
        pub_date: new Date(item.pubDate).toISOString(),
      }))
      .filter((item) => item.title.includes(district))
      .slice(0, 5);

    // Supabase에 저장 (아카이브)
    if (supabaseUrl && supabaseKey && news.length > 0) {
      await fetch(`${supabaseUrl}/rest/v1/news_archive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "resolution=ignore-duplicates",
        },
        body: JSON.stringify(
          news.map((item) => ({
            district,
            title: item.title,
            description: item.desc,
            url: item.url,
            source: item.source,
            pub_date: item.pub_date,
          }))
        ),
      });
    }

    return Response.json({ news });
  } catch (e) {
    return Response.json({ news: [], error: e.message });
  }
}