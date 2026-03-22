"use client";
import { useState } from "react";
import styles from "./page.module.css";

const PAGE_SIZE = 10;

export default function DistrictNews({ districts }) {
  const [selected, setSelected] = useState(null);
  const [archive, setArchive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  async function handleSelect(district) {
    if (selected === district) {
      setSelected(null);
      setArchive([]);
      setPage(1);
      setSearch("");
      return;
    }
    setSelected(district);
    setLoading(true);
    setPage(1);
    setSearch("");
    try {
      const res = await fetch(`/api/archive?district=${encodeURIComponent(district)}`);
      const data = await res.json();
      setArchive(data.news || []);
    } catch {
      setArchive([]);
    } finally {
      setLoading(false);
    }
  }

  // 검색 필터링
  const filtered = archive.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  // 페이지네이션
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
      {/* 구역 버튼 */}
      <div className={styles.districtButtons}>
        {districts.map((d) => (
          <button
            key={d}
            onClick={() => handleSelect(d)}
            className={`${styles.districtBtn} ${selected === d ? styles.districtBtnActive : ""}`}
          >
            {d}
          </button>
        ))}
      </div>

      {selected && (
        <div className={styles.districtNewsBox} style={{ maxWidth: "100%", overflowX: "hidden" }}>
          <div className={styles.districtNewsTitle}>
            📍 {selected} 아카이브
            <span style={{ fontSize: "11px", color: "#8a8070", fontWeight: 400, fontFamily: "monospace" }}>
              총 {filtered.length}건
            </span>
          </div>

          {/* 검색창 */}
          <div style={{ marginBottom: "16px" }}>
            <input
              type="text"
              placeholder="기사 제목 검색..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: "1px solid #d4c9b0",
                background: "#f5f0e8",
                fontFamily: "inherit",
                fontSize: "13px",
                color: "#1a1a2e",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {loading ? (
            <div className={styles.newsEmpty}>불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className={styles.newsEmpty}>
              {search ? "검색 결과가 없습니다." : "아직 아카이브된 뉴스가 없습니다."}
            </div>
          ) : (
            <>
              <div className={styles.newsList}>
                {paginated.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener"
                    className={styles.newsItem}
                    style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                  >
                    <span className={styles.newsNum}>
                      {String((page - 1) * PAGE_SIZE + i + 1).padStart(2, "0")}
                    </span>
                    <div className={styles.newsContent} style={{ minWidth: 0, overflow: "hidden" }}>
                      <div className={styles.newsMeta}>
                        <span className={styles.newsSource}>{item.source}</span>
                        <span className={styles.newsDate}>{item.date}</span>
                      </div>
                      <div className={styles.newsTitle} style={{ wordBreak: "break-word" }}>
                        {item.title}
                      </div>
                      {item.desc && (
                        <div className={styles.newsDesc} style={{ wordBreak: "break-word" }}>
                          {item.desc}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "20px",
                  flexWrap: "wrap",
                }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #d4c9b0",
                      background: page === 1 ? "#e8e0d0" : "#1a1a2e",
                      color: page === 1 ? "#b0a090" : "#f5f0e8",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      cursor: page === 1 ? "default" : "pointer",
                    }}
                  >
                    ← 이전
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                    .map((p, idx, arr) => (
                      <>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span key={`dots-${p}`} style={{ color: "#8a8070", fontSize: "11px" }}>...</span>
                        )}
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          style={{
                            padding: "6px 10px",
                            border: "1px solid #d4c9b0",
                            background: page === p ? "#c94a2e" : "#f5f0e8",
                            color: page === p ? "#fff" : "#1a1a2e",
                            fontFamily: "monospace",
                            fontSize: "11px",
                            cursor: "pointer",
                            fontWeight: page === p ? 700 : 400,
                          }}
                        >
                          {p}
                        </button>
                      </>
                    ))
                  }

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #d4c9b0",
                      background: page === totalPages ? "#e8e0d0" : "#1a1a2e",
                      color: page === totalPages ? "#b0a090" : "#f5f0e8",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      cursor: page === totalPages ? "default" : "pointer",
                    }}
                  >
                    다음 →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
