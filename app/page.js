import styles from "./page.module.css";
import DistrictNews from "./DistrictNews";

const QUICK_LINKS = [
  { icon: "🏢", label: "LH 한국토지주택공사", url: "https://www.lh.or.kr" },
  { icon: "🗂️", label: "서울 정비사업 정보몽땅", url: "https://cleanup.seoul.go.kr" },
  { icon: "🗺️", label: "네이버 부동산", url: "https://land.naver.com" },
  { icon: "📋", label: "국토교통부", url: "https://www.molit.go.kr" },
];

export const DISTRICTS = [
  "수원고색", "광명6구역", "광명3구역", "안양충훈부", "의왕내손",
  "숭인동1169", "시흥4동4", "면목9구역", "성북1구역", "신월5동77",
  "신월7동2", "거여새마을", "창동470", "천호A1-1", "전농9구역",
  "가리봉2-92", "신길1구역", "장위9구역", "상계3구역", "봉천13구역",
  "신설1구역", "도림1구역", "중화5구역"
];

async function getWeather() {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul",
      { cache: "no-store" }
    );
    const data = await res.json();
    const c = data.current;
    const d = data.daily;
    const WEATHER_DESC = {0:"맑음",1:"대체로 맑음",2:"구름 조금",3:"흐림",45:"안개",48:"짙은 안개",51:"가벼운 이슬비",53:"이슬비",55:"강한 이슬비",61:"가벼운 비",63:"비",65:"강한 비",71:"약한 눈",73:"눈",75:"강한 눈",80:"소나기",81:"소나기",82:"강한 소나기",95:"뇌우",99:"뇌우+우박"};
    const WEATHER_ICON = {0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",51:"🌦️",53:"🌦️",55:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",71:"🌨️",73:"❄️",75:"❄️",80:"🌦️",81:"🌧️",82:"⛈️",95:"⛈️",99:"⛈️"};
    return {
      temp: Math.round(c.temperature_2m),
      feels: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      wind: c.wind_speed_10m,
      desc: WEATHER_DESC[c.weather_code] ?? "날씨 정보",
      icon: WEATHER_ICON[c.weather_code] ?? "🌡️",
      high: Math.round(d.temperature_2m_max[0]),
      low: Math.round(d.temperature_2m_min[0]),
    };
  } catch { return null; }
}

async function getPublicNews() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!clientId || !clientSecret) return [];

  try {
    // 뉴스 20개 가져오기
    const res = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent("공공재개발")}&display=20&sort=date`,
      { headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": clientSecret }, cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.items.map((item) => ({
      title: item.title.replace(/<[^>]+>/g, ""),
      desc: item.description.replace(/<[^>]+>/g, ""),
      url: item.originallink || item.link,
      source: item.originallink ? new URL(item.originallink).hostname.replace("www.", "") : "뉴스",
      date: new Date(item.pubDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }),
    }));

    if (!anthropicKey) return items.slice(0, 3);

    // Claude AI로 수도권/전국 정책 관련 뉴스만 필터링
    const titles = items.map((item, i) => `${i + 1}. ${item.title}`).join("\n");
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `아래 공공재개발 뉴스 목록에서 수도권(서울/경기/인천) 관련이거나 전국 정책 관련인 뉴스 번호만 골라줘. 대구, 부산, 광주 등 지방 단독 뉴스는 제외. 번호만 쉼표로 구분해서 답해줘. 예: 1,3,5\n\n${titles}`
        }]
      }),
    });
    const aiData = await aiRes.json();
    const answer = aiData.content?.[0]?.text ?? "";
    const validIndices = answer
      .match(/\d+/g)
      ?.map((n) => parseInt(n) - 1)
      .filter((i) => i >= 0 && i < items.length) ?? [];

    const filtered = validIndices.length > 0
      ? validIndices.map((i) => items[i])
      : items;

    return filtered.slice(0, 3);
  } catch { return []; }
}

async function getDistrictLatestNews() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];
  try {
    const results = await Promise.all(
      DISTRICTS.map(async (d) => {
        const res = await fetch(
          `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(d + " 재개발")}&display=5&sort=date`,
          { headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": clientSecret }, cache: "no-store" }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.items || []).filter((item) =>
          item.title.replace(/<[^>]+>/g, "").includes(d)
        );
      })
    );

    const seen = new Set();
    return results
      .flat()
      .map((item) => ({
        title: item.title.replace(/<[^>]+>/g, ""),
        desc: item.description.replace(/<[^>]+>/g, ""),
        url: item.originallink || item.link,
        source: item.originallink ? new URL(item.originallink).hostname.replace("www.", "") : "뉴스",
        date: new Date(item.pubDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }),
        pubDate: new Date(item.pubDate).getTime(),
      }))
      .filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .sort((a, b) => b.pubDate - a.pubDate)
      .slice(0, 10);
  } catch { return []; }
}

export default async function Home() {
  const [weather, publicNews, districtLatestNews] = await Promise.all([
    getWeather(),
    getPublicNews(),
    getDistrictLatestNews(),
  ]);
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.diamond}></span>
          나만의 홈
        </div>
        <span className={styles.dateStr}>{today}</span>
        <div className={styles.headerRight}>
          <span className={styles.liveDot}></span>
          <span className={styles.liveText}>자동 갱신 중</span>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.headline}>
            오늘의 브리핑
            <span className={styles.headlineAccent}>공공재개발 뉴스</span>
          </h1>
          <p className={styles.sub}>날씨 · 실시간 뉴스 · 주요 링크 — 매일 자동 최신화되는 나만의 시작 페이지</p>
          <div className={styles.badges}>
            {["날씨 30분 갱신", "뉴스 1시간 갱신", "Vercel 자동 배포"].map((b) => (
              <span key={b} className={styles.badge}>{b}</span>
            ))}
          </div>
        </div>

        <div className={styles.weatherCard}>
          {weather ? (
            <>
              <div className={styles.weatherCity}>📍 서울</div>
              <div className={styles.weatherTemp}>{weather.temp}<sup>°</sup></div>
              <div className={styles.weatherDesc}>{weather.icon} {weather.desc}</div>
              <div className={styles.weatherRange}>최고 {weather.high}° / 최저 {weather.low}°</div>
              <div className={styles.weatherDetails}>
                {[["체감", `${weather.feels}°`], ["습도", `${weather.humidity}%`], ["풍속", `${weather.wind}m/s`]].map(([l, v]) => (
                  <div key={l} className={styles.weatherDetailItem}>
                    <strong>{v}</strong>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.weatherError}>날씨 정보를 불러올 수 없습니다</div>
          )}
        </div>
      </section>

      <div className={styles.main}>
        <section className={styles.newsSection}>

          {/* 공공재개발 뉴스 */}
          <div className={styles.sectionLabel}>
            공공재개발 뉴스
            <span className={styles.labelLine}></span>
            <span className={styles.labelBadge}>실시간</span>
          </div>
          {publicNews.length === 0 ? (
            <div className={styles.newsEmpty}>관련 뉴스가 없거나 불러오는 중입니다.</div>
          ) : (
            <div className={styles.newsList}>
              {publicNews.map((item, i) => (
                <a key={i} href={item.url} target="_blank" rel="noopener" className={styles.newsItem}>
                  <span className={styles.newsNum}>0{i + 1}</span>
                  <div className={styles.newsContent}>
                    <div className={styles.newsMeta}>
                      <span className={styles.newsSource}>{item.source}</span>
                      <span className={styles.newsDate}>{item.date}</span>
                    </div>
                    <div className={styles.newsTitle}>{item.title}</div>
                    <div className={styles.newsDesc}>{item.desc}</div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* 담당 지구 전체 최신뉴스 */}
          <div className={styles.sectionLabel} style={{marginTop: "36px"}}>
            담당 지구 최신 뉴스
            <span className={styles.labelLine}></span>
            <span className={styles.labelBadge}>실시간</span>
          </div>
          {districtLatestNews.length === 0 ? (
            <div className={styles.newsEmpty}>담당 지구 관련 최신 뉴스가 없습니다.</div>
          ) : (
            <div className={styles.newsList}>
              {districtLatestNews.map((item, i) => (
                <a key={i} href={item.url} target="_blank" rel="noopener" className={styles.newsItem}>
                  <span className={styles.newsNum}>{String(i + 1).padStart(2, "0")}</span>
                  <div className={styles.newsContent}>
                    <div className={styles.newsMeta}>
                      <span className={styles.newsSource}>{item.source}</span>
                      <span className={styles.newsDate}>{item.date}</span>
                    </div>
                    <div className={styles.newsTitle}>{item.title}</div>
                    <div className={styles.newsDesc}>{item.desc}</div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* 구역별 아카이브 */}
          <div className={styles.sectionLabel} style={{marginTop: "36px"}}>
            구역별 아카이브
            <span className={styles.labelLine}></span>
          </div>
          <DistrictNews districts={DISTRICTS} />

        </section>

        <aside className={styles.sidebar}>
          <div className={styles.sideSection}>
            <div className={styles.sectionLabel} style={{fontSize:"9px"}}>
              키워드 정보<span className={styles.labelLine}></span>
            </div>
            <div className={styles.keywordBadge}># 공공재개발</div>
            <div className={styles.infoBox}>
              <strong>공공재개발이란?</strong>
              LH·SH 등 공공기관이 민간과 공동 시행하는 재개발 방식. 용적률 혜택 대신 일부 세대를 공공임대로 공급합니다.
            </div>
            <div className={styles.keywordBadge} style={{marginTop:"12px"}}># 담당 지구 ({DISTRICTS.length}개)</div>
            <div className={styles.districtList}>
              {DISTRICTS.map((d) => (
                <span key={d} className={styles.districtTag}>{d}</span>
              ))}
            </div>
          </div>

          <div className={styles.sideSection}>
            <div className={styles.sectionLabel} style={{fontSize:"9px"}}>
              빠른 링크<span className={styles.labelLine}></span>
            </div>
            <div className={styles.quickLinks}>
              {QUICK_LINKS.map(({ icon, label, url }) => (
                <a key={label} href={url} target="_blank" rel="noopener" className={styles.quickLink}>
                  <span>{icon}</span>
                  <span>{label}</span>
                  <span className={styles.arrow}>→</span>
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <span className={styles.liveDot}></span>
          날씨 30분 · 뉴스 1시간 주기 자동 갱신
        </div>
        <span>나만의 시작 홈페이지 · Vercel + Next.js</span>
      </footer>
    </div>
  );
}