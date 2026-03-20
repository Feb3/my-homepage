export const revalidate = 1800; // 30분마다 자동 갱신

export async function GET() {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul",
      { next: { revalidate: 1800 } }
    );
    const data = await res.json();
    const c = data.current;
    const d = data.daily;

    const WEATHER_DESC = {
      0:"맑음",1:"대체로 맑음",2:"구름 조금",3:"흐림",
      45:"안개",48:"짙은 안개",51:"가벼운 이슬비",53:"이슬비",55:"강한 이슬비",
      61:"가벼운 비",63:"비",65:"강한 비",71:"약한 눈",73:"눈",75:"강한 눈",
      80:"소나기",81:"소나기",82:"강한 소나기",95:"뇌우",99:"뇌우+우박"
    };
    const WEATHER_ICON = {
      0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",
      51:"🌦️",53:"🌦️",55:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",
      71:"🌨️",73:"❄️",75:"❄️",80:"🌦️",81:"🌧️",82:"⛈️",95:"⛈️",99:"⛈️"
    };

    return Response.json({
      temp: Math.round(c.temperature_2m),
      feels: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      wind: c.wind_speed_10m,
      desc: WEATHER_DESC[c.weather_code] ?? "날씨 정보",
      icon: WEATHER_ICON[c.weather_code] ?? "🌡️",
      high: Math.round(d.temperature_2m_max[0]),
      low: Math.round(d.temperature_2m_min[0]),
    });
  } catch (e) {
    return Response.json({ error: "날씨 정보를 불러올 수 없습니다" }, { status: 500 });
  }
}
