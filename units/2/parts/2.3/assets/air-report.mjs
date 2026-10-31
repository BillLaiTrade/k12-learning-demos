export const reportRules = Object.freeze([
  { name: 'composition', expected: 'mixture', label: '組成與分類', hint: '乾燥只是不計水蒸氣；二氧化碳仍在乾燥空氣中，氮氣最多。', target: 's2' },
  { name: 'sample_a', expected: 'oxygen', label: 'A瓶的氣體', hint: '雙氧水分解產生氧氣，二氧化錳用來加快分解。', target: 's3' },
  { name: 'sample_b', expected: 'co2', label: 'B瓶的氣體', hint: '大理石與稀鹽酸反應，可製備二氧化碳。', target: 's4' },
  { name: 'fuel', expected: 'wood', label: '木條與助燃', hint: '燃燒的是木條；氧氣助燃，不是這個觀察中的燃料。', target: 's3' },
  { name: 'evidence', expected: 'limewater', label: '二氧化碳的檢驗', hint: '適量二氧化碳使澄清石灰水變混濁。熄火或透明都不能唯一辨認它。', target: 's4' },
  { name: 'uses', expected: 'stable', label: '性質與用途', hint: '氮氣與氬氣在一般條件下相對不易反應，性質才是選用的理由。', target: 's2' }
]);
export function evaluateGasReport(answers = {}) {
  const missing = reportRules.filter(rule => !answers[rule.name]);
  const corrections = reportRules.filter(rule => answers[rule.name] && answers[rule.name] !== rule.expected);
  return { complete: missing.length === 0, correct: missing.length === 0 && corrections.length === 0, missing, corrections };
}
