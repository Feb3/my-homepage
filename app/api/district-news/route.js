"use client";
import { useState } from "react";
import styles from "./page.module.css";

export default function DistrictNews({ districts }) {
  const [selected, setSelected] = useState(null);
  const [archive, setArchive] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSelect(district) {
    if (selected === district) {
      setSelected(null);
      setArchive([]);
      return;
    }
    setSelected(district);
    setLoading(true);
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

  return (
    <div>
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
        <div className={styles.districtNewsBox}>
          <div className={styles.districtNewsTitle}>
            📍 {selected} 아카이브
          </div>
          {loading ? (
            <div className={styles.newsEmpty}>불러오는 중...</div>
          ) : archive.length === 0 ? (
            <div className={styles.newsEmpty}>아직 아카이브된 뉴스가 없습니다. 내일 오전 9시부터 자동으로 쌓입니다!</div>
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
          )}
        </div>
      )}
    </div>
  );
}