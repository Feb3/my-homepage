export const metadata = {
  title: "나만의 홈페이지 - 공공재개발 뉴스",
  description: "날씨와 공공재개발 최신 뉴스를 자동으로 보여주는 개인 시작 페이지",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
