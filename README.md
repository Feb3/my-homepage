# 나만의 홈페이지 - 배포 가이드

자동으로 날씨와 공공재개발 뉴스를 최신화해주는 개인 시작 페이지입니다.

---

## 📋 배포 순서

### 1단계 - 네이버 API 키 발급
1. https://developers.naver.com 접속 후 로그인
2. [Application] → [애플리케이션 등록] 클릭
3. 이름: 아무거나 입력 (예: 나만의홈)
4. 사용 API: **검색** 체크
5. 환경: **WEB** 선택, URL에 `https://localhost` 입력
6. 등록 후 **Client ID**와 **Client Secret** 메모장에 복사

---

### 2단계 - GitHub에 코드 올리기
1. https://github.com 접속 후 회원가입 (이미 있으면 로그인)
2. 오른쪽 위 **+** 버튼 → **New repository** 클릭
3. Repository name: `my-homepage` 입력
4. **Create repository** 클릭
5. 페이지에서 **uploading an existing file** 클릭
6. 이 폴더 안의 파일들을 모두 드래그 앤 드롭으로 업로드
7. **Commit changes** 클릭

---

### 3단계 - Vercel에 배포
1. https://vercel.com 접속 → **GitHub로 로그인**
2. **Add New Project** 클릭
3. `my-homepage` 저장소 선택 → **Import**
4. **Environment Variables** 섹션에서:
   - Name: `NAVER_CLIENT_ID` / Value: 복사해둔 Client ID 붙여넣기
   - Name: `NAVER_CLIENT_SECRET` / Value: 복사해둔 Client Secret 붙여넣기
5. **Deploy** 클릭!

🎉 몇 분 후 `https://my-homepage-xxx.vercel.app` 주소로 접속 가능!

---

## 🔄 자동 갱신 주기
- 날씨: **30분**마다 자동 갱신
- 뉴스: **1시간**마다 자동 갱신

---

## 🌐 브라우저 홈페이지로 설정
Chrome → 설정 → 시작 그룹 → 특정 페이지 열기 → Vercel 주소 입력
