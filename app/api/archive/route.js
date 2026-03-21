export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const district = searchParams.get("district");
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!district || !supabaseUrl || !supabaseKey) {
    return Response.json({ news: [] });
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/news_archive?district=eq.${encodeURIComponent(district)}&order=pub_date.desc&limit=50`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
        cache: "no-store",
      }
    );
    const data = await res.json();
    const news = data.map((item) => ({
      title: item.title,
      desc: item.description,
      url: item.url,
      source: item.source,
      date: new Date(item.pub_date).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }),
    }));
    return Response.json({ news });
  } catch (e) {
    return Response.json({ news: [], error: e.message });
  }
}