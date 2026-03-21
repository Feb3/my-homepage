import styles from "./page.module.css";

const QUICK_LINKS = [
  { icon: "🏢", label: "LH 한국토지주택공사", url: "https://www.lh.or.kr" },
  { icon: "🏙️", label: "SH 서울주택도시공사", url: "https://www.seoulhousing.kr" },
  { icon: "🗂️", label: "서울 정비사업 정보몽땅", url: "https://cleanup.seoul.go.kr" },
  { icon: "🗺️", label: "네이버 부동산", url: "https://land.naver.com" },
  { icon: "📋", label: "국토교통부", url: "https://www.molit.go.kr" },
];

async function getWeather() {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul",
      { next: { revalidate: 1800 } }
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

async function getNews() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) return [];

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

  try {
    const results = await Promise.all(
      KEYWORDS.map(async (kw) => {
        const res = await fetch(
          `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(kw)}&display=3&sort=date`,
          {
            headers: {
              "X-Naver-Client-Id": clientId,
              "X-Naver-Client-Secret": clientSecret,
            },
            next: { revalidate: 3600 },
          }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return data.items || [];
      })
    );

    const seen = new Set();
    return results
      .flat()
      .map((item) => ({
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
      }))
      .filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .sort((a, b) => b.pubDate - a.pubDate)
      .slice(0, 5);
  } catch { return []; }
}

export default async function Home() {
  const [weather, news] = await Promise.all([getWeather(), getNews()]);
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
          <div className={styles.sectionLabel}>
            공공재개발 주요 뉴스
            <span className={styles.labelLine}></span>
            <span className={styles.labelBadge}>실시간</span>
          </div>
          {news.length === 0 ? (
            <div className={styles.newsEmpty}>뉴스를 불러오는 중이거나 API 키를 확인해주세요.</div>
          ) : (
            <div className={styles.newsList}>
              {news.map((item, i) => (
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