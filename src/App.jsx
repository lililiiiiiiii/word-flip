import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem('flashcards_v3');
    return saved ? JSON.parse(saved) : [];
  });
  const [filterMode, setFilterMode] = useState('ALL');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('flashcards_v3', JSON.stringify(cards));
  }, [cards]);

  const displayCards = cards.filter((card) => {
    if (filterMode === 'NEEDS_REVIEW') return card.needsReview;
    return true;
  });

  const currentCard = displayCards[currentIndex];

  // 語音發音
  const speak = (text, e) => {
    if (e) e.stopPropagation();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // 自動翻譯
  const handleTranslate = async () => {
    if (!word.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh-TW`
      );
      const data = await res.json();
      setTranslation(data.responseData.translatedText || '查無翻譯');
    } catch (err) {
      setTranslation('翻譯失敗');
    } finally {
      setLoading(false);
    }
  };

  // 新增單字
  const handleAddCard = () => {
    if (!word || !translation) return;
    const newCard = {
      id: Date.now(),
      word,
      translation,
      needsReview: true,
      level: 0,
    };
    setCards([newCard, ...cards]);
    setWord('');
    setTranslation('');
  };

  // 刪除單字
  const handleDeleteCard = (id) => {
    const updated = cards.filter((c) => c.id !== id);
    setCards(updated);
    if (currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }
  };

  // 隨機洗牌
  const handleShuffle = () => {
    if (displayCards.length <= 1) return;
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // 記憶反饋
  const handleMemoryFeedback = (quality) => {
    if (!currentCard) return;
    let newLevel = currentCard.level || 0;
    if (quality === 'HARD') newLevel = 0;
    else if (quality === 'GOOD') newLevel = Math.max(1, newLevel);
    else if (quality === 'EASY') newLevel += 1;

    const isNeedsReview = newLevel < 3;
    const updatedCards = cards.map((c) =>
      c.id === currentCard.id ? { ...c, level: newLevel, needsReview: isNeedsReview } : c
    );

    setCards(updatedCards);
    setIsFlipped(false);

    if (currentIndex < displayCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  // 📥 匯出 CSV 檔案
  const handleExportCSV = () => {
    if (cards.length === 0) return alert('尚無單字可匯出');
    let csvContent = "\uFEFF英文,中文\n"; // 加入 BOM 避免 Excel 開啟亂碼
    cards.forEach(c => {
      // 處理含有逗號或引號的字串
      const safeWord = `"${c.word.replace(/"/g, '""')}"`;
      const safeTrans = `"${c.translation.replace(/"/g, '""')}"`;
      csvContent += `${safeWord},${safeTrans}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vocab_backup_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 📤 匯入 CSV 檔案
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r\n|\n/);
      const importedCards = [];

      lines.forEach((line, index) => {
        if (index === 0 || !line.trim()) return; // 忽略 Header 與空行
        // 簡單解析 CSV 欄位
        const parts = line.split(',');
        if (parts.length >= 2) {
          const w = parts[0].replace(/^"|"$/g, '').trim();
          const t = parts[1].replace(/^"|"$/g, '').trim();
          if (w && t) {
            importedCards.push({
              id: Date.now() + index,
              word: w,
              translation: t,
              needsReview: true,
              level: 0,
            });
          }
        }
      });

      if (importedCards.length > 0) {
        setCards([...importedCards, ...cards]);
        alert(`成功匯入 ${importedCards.length} 個單字！`);
      } else {
        alert('匯入失敗，請確認 CSV 格式包含「英文,中文」欄位。');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div style={styles.appContainer}>
      <main style={styles.mainContent}>
        <header style={styles.header}>
          <h1 style={styles.brandTitle}>Vocabulary</h1>
          <p style={styles.subTitle}>極簡翻牌記憶工具</p>
        </header>

        {/* 搜尋/新增單字卡片 */}
        <div style={styles.inputCard}>
          <div style={styles.inputGroup}>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="輸入英文單字..."
              style={styles.cleanInput}
              onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
            />
            <button onClick={handleTranslate} style={styles.btnIcon} disabled={loading}>
              {loading ? '...' : '🔍'}
            </button>
          </div>

          {translation && (
            <div style={styles.transResult}>
              <div style={styles.transHeader}>
                <span style={styles.transText}>{translation}</span>
                <button onClick={(e) => speak(word, e)} style={styles.audioBtn}>🔊 聽發音</button>
              </div>
              <button onClick={handleAddCard} style={styles.btnFull}>➕ 加入單字庫</button>
            </div>
          )}
        </div>

        {/* 翻牌練習區 */}
        {cards.length > 0 && (
          <section style={styles.flashcardSection}>
            <div style={styles.tabBar}>
              <div style={styles.tabGroup}>
                <span 
                  style={filterMode === 'ALL' ? styles.activeTab : styles.tab}
                  onClick={() => { setFilterMode('ALL'); setCurrentIndex(0); }}
                >
                  全部 ({cards.length})
                </span>
                <span 
                  style={filterMode === 'NEEDS_REVIEW' ? styles.activeTab : styles.tab}
                  onClick={() => { setFilterMode('NEEDS_REVIEW'); setCurrentIndex(0); }}
                >
                  待複習 ({cards.filter(c => c.needsReview).length})
                </span>
              </div>
              <button onClick={handleShuffle} style={styles.textBtn}>🔀 洗牌</button>
            </div>

            {displayCards.length === 0 ? (
              <div style={styles.emptyState}>進度達成！目前無待複習單字 ✨</div>
            ) : (
              <>
                <div 
                  style={{
                    ...styles.card3D,
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* 正面 */}
                  <div style={{ ...styles.cardFace, ...styles.cardFront }}>
                    <span style={styles.cardWord}>{currentCard?.word}</span>
                    <button onClick={(e) => speak(currentCard?.word, e)} style={styles.speakerPill}>
                      🔊 點擊發音
                    </button>
                    <span style={styles.flipHint}>點擊翻牌</span>
                  </div>

                  {/* 背面 */}
                  <div style={{ ...styles.cardFace, ...styles.cardBack }}>
                    <span style={styles.cardTranslation}>{currentCard?.translation}</span>
                  </div>
                </div>

                {/* 翻轉後的評估按鈕 */}
                {isFlipped ? (
                  <div style={styles.feedbackGroup}>
                    <button onClick={() => handleMemoryFeedback('HARD')} style={styles.btnHard}>忘記</button>
                    <button onClick={() => handleMemoryFeedback('GOOD')} style={styles.btnGood}>模糊</button>
                    <button onClick={() => handleMemoryFeedback('EASY')} style={styles.btnEasy}>精通</button>
                  </div>
                ) : (
                  <div style={styles.navRow}>
                    <button 
                      disabled={currentIndex === 0} 
                      onClick={() => { setIsFlipped(false); setCurrentIndex(p => p - 1); }} 
                      style={styles.navBtn}
                    >
                      ←
                    </button>
                    <span style={styles.progressText}>{currentIndex + 1} / {displayCards.length}</span>
                    <button 
                      disabled={currentIndex === displayCards.length - 1} 
                      onClick={() => { setIsFlipped(false); setCurrentIndex(p => p + 1); }} 
                      style={styles.navBtn}
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* 底部微調與 CSV 管理選項 */}
        <footer style={styles.footer}>
          {currentCard && (
            <button onClick={() => handleDeleteCard(currentCard.id)} style={styles.deleteTextBtn}>
              刪除當前單字
            </button>
          )}
          <div style={styles.csvActions}>
            <button onClick={handleExportCSV} style={styles.footerLink}>匯出 CSV</button>
            <span>•</span>
            <button onClick={() => fileInputRef.current.click()} style={styles.footerLink}>匯入 CSV</button>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleImportCSV} 
              style={{ display: 'none' }} 
            />
          </div>
        </footer>
      </main>
    </div>
  );
}

// 極簡風樣式
const styles = {
  appContainer: { backgroundColor: '#F9FAFB', minHeight: '100vh', display: 'flex', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  mainContent: { width: '100%', maxWidth: '420px', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '24px' },
  header: { textAlign: 'center', marginBottom: '8px' },
  brandTitle: { fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0, letterSpacing: '-0.5px' },
  subTitle: { fontSize: '14px', color: '#6B7280', marginTop: '4px' },
  inputCard: { backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' },
  inputGroup: { display: 'flex', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: '12px', padding: '4px 12px' },
  cleanInput: { flex: 1, border: 'none', background: 'transparent', padding: '10px 0', fontSize: '15px', color: '#111827', outline: 'none' },
  btnIcon: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' },
  transResult: { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', gap: '12px' },
  transHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  transText: { fontSize: '16px', fontWeight: '600', color: '#111827' },
  audioBtn: { border: 'none', background: '#F3F4F6', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', color: '#374151', cursor: 'pointer' },
  btnFull: { width: '100%', padding: '10px', backgroundColor: '#111827', color: '#FFF', border: 'none', borderRadius: '10px', fontWeight: '500', cursor: 'pointer', fontSize: '14px' },
  flashcardSection: { display: 'flex', flexDirection: 'column', gap: '16px' },
  tabBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' },
  tabGroup: { display: 'flex', gap: '16px' },
  tab: { fontSize: '14px', color: '#9CA3AF', cursor: 'pointer', fontWeight: '500' },
  activeTab: { fontSize: '14px', color: '#111827', fontWeight: '700', borderBottom: '2px solid #111827', paddingBottom: '2px', cursor: 'pointer' },
  textBtn: { border: 'none', background: 'transparent', color: '#6B7280', fontSize: '13px', cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: '14px' },
  card3D: { width: '100%', height: '240px', perspective: '1000px', position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer' },
  cardFace: { position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', padding: '24px', boxSizing: 'border-box' },
  cardFront: { backgroundColor: '#FFFFFF' },
  cardBack: { backgroundColor: '#111827', color: '#FFFFFF', transform: 'rotateY(180deg)' },
  cardWord: { fontSize: '32px', fontWeight: '700', color: '#111827', tracking: '-0.5px' },
  cardTranslation: { fontSize: '28px', fontWeight: '600' },
  speakerPill: { border: 'none', background: '#F3F4F6', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', color: '#4B5563', marginTop: '16px', cursor: 'pointer' },
  flipHint: { position: 'absolute', bottom: '16px', fontSize: '12px', color: '#D1D5DB' },
  navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' },
  navBtn: { border: 'none', background: '#FFFFFF', width: '40px', height: '40px', borderRadius: '50%', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontSize: '16px', cursor: 'pointer', color: '#374151' },
  progressText: { fontSize: '13px', color: '#9CA3AF', fontWeight: '500' },
  feedbackGroup: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' },
  btnHard: { padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: '#FEE2E2', color: '#991B1B', fontWeight: '600', cursor: 'pointer' },
  btnGood: { padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: '600', cursor: 'pointer' },
  btnEasy: { padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: '#D1FAE5', color: '#065F46', fontWeight: '600', cursor: 'pointer' },
  footer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: 'auto', paddingTop: '20px' },
  deleteTextBtn: { border: 'none', background: 'transparent', color: '#EF4444', fontSize: '13px', cursor: 'pointer' },
  csvActions: { display: 'flex', gap: '8px', alignItems: 'center', color: '#D1D5DB', fontSize: '12px' },
  footerLink: { border: 'none', background: 'transparent', color: '#9CA3AF', fontSize: '12px', cursor: 'pointer' },
};
