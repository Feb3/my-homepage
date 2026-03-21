"use client";
import { useState } from "react";
import styles from "./page.module.css";

export default function DistrictNews({ districts }) {
  const [selected, setSelected] = useState(null);
  const [news, setNews] = useState([]);
  const [archive, setArchive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("latest"); // "latest" | "archive"

  async function handleSelect(district) {
    if (selected === district) {
      setSelected(null);
      setNews([]);
      setArchive([]);
      return;
    }
    setSelected(district);
    setLoading(true);
    setTab("latest");

    try {
      const [newsRes, archiveRes] = await Promise.all([
        fetch(`/api/district-news?district=${encodeURIComponent(district)}`),
        fetch(`/api/archive?district=${encodeURIComponent(district)}`),
      ]);
      const newsData = await newsRes.json();
      const archiveData = await archiveRes.json();
      setNews(newsData.news || []);
      setArchive(archiveData.news || []);
    } catch {
      setNews([]);
      setArchive([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* 구역 버튼 목록 */}
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

      {/* 뉴스 표시 */}
      {selected && (
        <div className={styles.districtNewsBox}>
          <div className={styles.districtNewsTitle}>
            📍 {selected}
            <div className={styles.tabButtons}>
              <button
                onClick={() => setTab("latest")}
                className={`${styles.tabBtn} ${tab === "latest" ? styles.tabBtnActive : ""}`}
              >
                최신 뉴스
              </button>
              <button
                onClick={() => setTab("archive")}
                className={`${styles.tabBtn} ${tab === "archive" ? styles.tabBtnActive : ""}`}
              >
                아카이브 ({archive.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.newsEmpty}>불러오는 중...</div>
          ) : tab === "latest" ? (
            news.length === 0 ? (
              <div className={styles.newsEmpty}>관련 뉴스가 없습니다.</div>
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
            )
          ) : (
            archive.length === 0 ? (
              <div className={styles.newsEmpty}>아카이브된 뉴스가 없습니다. 최신 뉴스를 확인하면 자동으로 저장됩니다.</div>
            ) : (
              <div className={styles.newsList}>
                {archive.map((item, i) => (
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
            )
          )}
        </div>
      )}
    </div>
  );
}