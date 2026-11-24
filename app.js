'use strict';
const $ = id => document.getElementById(id);
const KEY = 'suhaeng-v1';
const won = n => Number(n).toLocaleString('ko-KR');
let state = { records: [], goal: null };
let pending = null, previewURL = null, busy = false;
function notify(text) { $('status').textContent = text; }
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && Array.isArray(saved.records)) {
    state.records = saved.records.filter(r => typeof r.name === 'string' && Number.isSafeInteger(r.amount) && r.amount > 0 && r.amount <= 1e9 && typeof r.saved === 'boolean' && Number.isFinite(r.time));
    if (saved.goal && typeof saved.goal.name === 'string' && Number.isSafeInteger(saved.goal.amount) && saved.goal.amount > 0 && saved.goal.amount <= 1e9) state.goal = saved.goal;
  }
} catch { notify('저장된 기록을 불러오지 못했어요. 새 기록으로 시작합니다.'); }
function persist(next) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); state = next; return true; }
  catch { notify('브라우저에 저장하지 못했어요. 저장 공간과 브라우저 설정을 확인해 주세요.'); return false; }
}
function render() {
  const saved = state.records.filter(r => r.saved);
  const total = saved.reduce((sum, r) => sum + r.amount, 0);
  $('saved').replaceChildren(document.createTextNode(won(total)), Object.assign(document.createElement('span'), { textContent: '원' }));
  $('count').textContent = saved.length ? `${saved.length}번의 멈춤, 그만큼 가까워진 목표` : '아직 첫 번째 연습을 기다리고 있어요';
  const ratio = state.goal ? Math.min(100, total / state.goal.amount * 100) : 0;
  $('goal-name').textContent = state.goal?.name || '나만의 목표를 정해보세요';
  $('progress').value = ratio;
  $('percent').textContent = `${Math.floor(ratio)}%`;
  $('remaining').textContent = state.goal ? `${won(Math.max(0, state.goal.amount - total))}원 남았어요` : '작은 목표부터 시작해요';
  $('congrats').hidden = !state.goal || total < state.goal.amount;
  $('edit-goal').textContent = state.goal ? '목표 수정' : '목표 설정';
  $('history').replaceChildren();
  if (!state.records.length) $('history').append(Object.assign(document.createElement('p'), { className: 'empty', textContent: '아직 기록이 없어요. 오늘의 첫 선택을 남겨보세요.' }));
  state.records.slice(-10).reverse().forEach(r => {
    const row = document.createElement('div'); row.className = 'history-row';
    const left = document.createElement('div'), right = document.createElement('div');
    left.append(Object.assign(document.createElement('strong'), { textContent: r.name }), Object.assign(document.createElement('small'), { textContent: new Date(r.time).toLocaleDateString('ko-KR') }));
    right.className = r.saved ? 'resisted' : '';
    right.append(Object.assign(document.createElement('strong'), { textContent: `${r.saved ? '+' : ''}${won(r.amount)}원` }), Object.assign(document.createElement('small'), { textContent: r.saved ? '참았어요' : '구매 선택' }));
    row.append(left, right); $('history').append(row);
  });
}
function invalidate() { pending = null; $('result').hidden = true; }
['item', 'amount'].forEach(id => $(id).addEventListener('input', invalidate));
document.querySelectorAll('[name=flavor]').forEach(el => el.addEventListener('change', () => { if (pending) showAdvice(); }));
function showAdvice() {
  const spicy = document.querySelector('[name=flavor]:checked').value === 'spicy';
  $('result-title').textContent = `이 ${won(pending.amount)}원, 다른 곳에 쓴다면?`;
  $('comparisons').replaceChildren();
  [['🍗', '치킨', 25000], ['☕', '커피', 5000], ['🎬', '영화', 15000]].forEach(([emoji, name, price]) => {
    const card = document.createElement('div'); card.className = 'comparison';
    const times = Math.floor(pending.amount / price * 10) / 10;
    card.append(Object.assign(document.createElement('span'), { textContent: `${emoji} ${name}` }), Object.assign(document.createElement('strong'), { textContent: `약 ${times.toLocaleString('ko-KR')}번` }));
    $('comparisons').append(card);
  });
  $('advice').textContent = spicy ? '장바구니에 담았다고 필요한 물건이 되진 않아. 광고 끄고 하루만 기다려 봐. 내일도 필요하면 그때 결정하자.' : '갖고 싶은 마음은 자연스러워요. 오늘은 잠깐 멈추고, 내일도 필요한지 생각해 볼까요? 참은 금액만큼 진짜 원하는 것에 가까워져요.';
  $('result').hidden = false;
}
$('analyze-form').addEventListener('submit', e => {
  e.preventDefault(); if (busy) return;
  const amount = Number($('amount').value), name = $('item').value.trim();
  if (!name || !Number.isSafeInteger(amount) || amount <= 0 || amount > 1e9) { notify('물건 이름과 1원~10억 원 사이의 정수 금액을 입력해 주세요.'); return; }
  pending = { name, amount }; showAdvice(); notify('금액을 확인하고 오늘의 선택을 남겨주세요.');
  $('result').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
function record(saved) {
  if (!pending) return;
  const next = { ...state, records: [...state.records, { ...pending, saved, time: Date.now() }] };
  if (!persist(next)) return;
  invalidate(); render(); $('analyze-form').reset(); $('image').value = ''; $('preview').hidden = true; $('ocr-details').hidden = true;
  if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
  notify(saved ? '잘 참았어요! 가상 저금통에 기록했어요.' : '구매 선택을 기록했어요. 충분히 생각한 선택이길 바라요.');
  $('status').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
$('resist').addEventListener('click', () => record(true));
$('buy').addEventListener('click', () => record(false));
$('edit-goal').addEventListener('click', () => { $('goal-input').value = state.goal?.name || ''; $('goal-amount').value = state.goal?.amount || ''; $('goal-dialog').showModal(); });
$('cancel-goal').addEventListener('click', () => $('goal-dialog').close());
$('goal-form').addEventListener('submit', e => {
  e.preventDefault(); const name = $('goal-input').value.trim(), amount = Number($('goal-amount').value);
  if (!name || !Number.isSafeInteger(amount) || amount < 1 || amount > 1e9) return;
  if (persist({ ...state, goal: { name, amount } })) { render(); $('goal-dialog').close(); }
});
// 합계를 우선하고, 없으면 원/통화기호가 있는 금액 중 최댓값을 후보로 제안합니다.
function extractAmount(text) {
  const amounts = line => [...line.matchAll(/(?:[₩￦]\s*([\d,]+)|([\d,]+)\s*원|\b(\d{1,3}(?:,\d{3})+)\b)/g)].map(m => Number((m[1] || m[2] || m[3]).replaceAll(',', ''))).filter(n => Number.isSafeInteger(n) && n > 0 && n <= 1e9);
  const lines = text.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/총\s*(?:결제|주문|상품)?\s*금액|결제\s*(?:예정\s*)?금액|합계|total/i.test(lines[i])) {
      const matches = amounts(lines[i]);
      if (matches.length) return matches[matches.length - 1];
      const next = amounts(lines[i + 1] || ''); if (next.length) return next[0];
    }
  }
  const all = amounts(text); return all.length ? Math.max(...all) : null;
}
let ocrLoader;
function loadOCR() {
  if (window.Tesseract) return Promise.resolve();
  if (!ocrLoader) ocrLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    script.onload = resolve; script.onerror = () => { ocrLoader = null; script.remove(); reject(new Error('OCR download failed')); }; document.head.append(script);
  });
  return ocrLoader;
}
$('image').addEventListener('change', async () => {
  const file = $('image').files[0]; if (!file || busy) return;
  invalidate(); $('ocr-details').hidden = true; $('preview').hidden = true;
  if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { notify('10MB 이하의 JPG, PNG, WEBP 이미지를 올려주세요.'); $('image').value = ''; return; }
  busy = true; $('image').disabled = true; $('analyze').disabled = true;
  $('item').value = ''; $('amount').value = '';
  let worker;
  try {
    previewURL = URL.createObjectURL(file); const img = new Image(); img.src = previewURL; await img.decode();
    if (img.width < 100 || img.height < 100 || img.width * img.height > 25000000) throw new Error('Invalid image dimensions');
    $('preview').src = previewURL; $('preview').hidden = false;
    notify('글자를 읽는 중이에요. 처음에는 인식 도구를 내려받아 잠시 걸릴 수 있어요.');
    await loadOCR(); worker = await Tesseract.createWorker('kor+eng');
    const { data } = await worker.recognize(file);
    $('ocr-text').textContent = data.text; $('ocr-details').hidden = false;
    const amount = extractAmount(data.text);
    if (!amount) { notify('금액을 찾지 못했어요. 글자가 선명한 캡처로 다시 올리거나 직접 입력해 주세요.'); return; }
    $('item').value = '장바구니 전체'; $('amount').value = amount;
    notify('금액 후보를 찾았어요. 상품별 인식 대신 합계만 제안하므로, 이름과 최종 결제 금액을 확인·수정해 주세요.');
  } catch { notify('이미지를 읽지 못했어요. 이미지와 인터넷 연결을 확인하거나 직접 입력해 주세요.'); }
  finally { busy = false; $('image').disabled = false; $('analyze').disabled = false; if (worker) await worker.terminate().catch(() => {}); }
});
render();
