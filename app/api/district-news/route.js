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
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(district + " 재개발")}&display=20&sort=date`,
      { headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": clientSecret }, cache: "no-store" }
    );
    const data = await res.json();

    const items = (data.items || [])
      .map((item) => ({
        title: item.title.replace(/<[^>]+>/g, ""),
        desc: item.description.replace(/<[^>]+>/g, ""),
        url: item.originallink || item.link,
        source: item.originallink ? new URL(item.originallink).hostname.replace("www.", "") : "뉴스",
        date: new Date(item.pubDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }),
        pub_date: new Date(item.pubDate).toISOString(),
        pubTime: new Date(item.pubDate).getTime(),
      }))
      .filter((item) => item.title.includes(district));

    // 제목 유사도로 중복 제거
    // 제목에서 핵심 명사 추출 (5글자 이상 공통 부분)
    function getSimilarityKey(title) {
      // 괄호, 특수문자 제거 후 핵심만 추출
      return title
        .replace(/\[.*?\]/g, "")
        .replace(/[^\w가-힣]/g, " ")
        .trim()
        .split(/\s+/)
        .filter((w) => w.length >= 2)
        .slice(0, 5)
        .join(" ");
    }

    function isSimilar(a, b) {
      const wordsA = new Set(a.replace(/[^\w가-힣]/g, " ").split(/\s+/).filter((w) => w.length >= 2));
      const wordsB = b.replace(/[^\w가-힣]/g, " ").split(/\s+/).filter((w) => w.length >= 2);
      const common = wordsB.filter((w) => wordsA.has(w)).length;
      const similarity = common / Math.max(wordsA.size, wordsB.length);
      return similarity >= 0.3; // 30% 이상 단어 겹치면 같은 뉴스로 판단
    }

    // 그룹화: 유사한 기사끼리 묶기
    const groups = [];
    for (const item of items) {
      const existingGroup = groups.find((g) => isSimilar(g[0].title, item.title));
      if (existingGroup) {
        existingGroup.push(item);
      } else {
        groups.push([item]);
      }
    }

    // 각 그룹에서 대표 기사 1개 선택 (가장 오래된 최초 보도)
    const deduped = groups
      .map((group) => group.sort((a, b) => a.pubTime - b.pubTime)[0])
      .sort((a, b) => b.pubTime - a.pubTime)
      .slice(0, 5);

    // Supabase에 저장
    if (supabaseUrl && supabaseKey && deduped.length > 0) {
      await fetch(`${supabaseUrl}/rest/v1/news_archive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "resolution=ignore-duplicates",
        },
        body: JSON.stringify(
          deduped.map((item) => ({
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

    return Response.json({ news: deduped });
  } catch (e) {
    return Response.json({ news: [], error: e.message });
  }
}