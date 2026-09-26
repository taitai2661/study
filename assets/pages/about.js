import {escapeHtml} from '../shared/core.js'
import {offline,header,footer} from '../shared/layout.js'
import {loadUnitIndex} from '../data/data-loader.js'
import {gradeLabel} from '../shared/presentation.js'

const root=document.querySelector('#root')
let units=[]


function referenceList(){
  return `<section class="source-card" aria-labelledby="references-title">
    <h2 id="references-title">参照している基準</h2>
    <p>教材の単元構成は、文部科学省の小学校・中学校・高等学校学習指導要領と各教科の解説を基準として整理しています。</p>
    <ul class="reference-list">
      <li>
        <a href="https://www.mext.go.jp/a_menu/shotou/new-cs/1384661.htm" target="_blank" rel="noopener"><span>文部科学省</span><i>平成29・30・31年改訂学習指導要領（本文、解説）</i></a>
        <small>小学校学習指導要領（平成29年告示）と各教科の解説への入口です。</small>
      </li>
      <li>
        <a href="https://www.mext.go.jp/a_menu/shotou/new-cs/1387014.htm" target="_blank" rel="noopener"><span>文部科学省</span><i>小学校学習指導要領（平成29年告示）解説</i></a>
        <small>算数編・理科編を含む小学校各教科の解説資料への入口です。</small>
      </li>
      <li>
        <a href="https://www.mext.go.jp/a_menu/shotou/new-cs/1387016.htm" target="_blank" rel="noopener"><span>文部科学省</span><i>中学校学習指導要領（平成29年告示）解説</i></a>
        <small>中学校数学編を含む各教科の解説資料への入口です。</small>
      </li>
      <li>
        <a href="https://www.mext.go.jp/content/20230217-mxt_kyoiku02-100002620_05.pdf" target="_blank" rel="noopener"><span>文部科学省</span><i>高等学校学習指導要領（平成30年告示）解説 数学編</i></a>
        <small>数学I・A・II・B・C・IIIの単元構成を整理する際の基準です。</small>
      </li>
    </ul>
    <p class="source-location">出典：文部科学省「小学校・中学校学習指導要領（平成29年告示）および各教科の解説」（上記リンク、2026年7月29日参照）を基に、まなびばが単元構成を整理・加工して作成。外部資料の本文・画像はこのサイト内に転載していません。教材問題は、参照基準に沿って独自の文章と問題生成ロジックで作成しています。</p>
  </section>`
}

function summaryCards(){
  return `<section class="source-card" aria-label="教材の要約">
    <div class="principles">
      <article><span>基準</span><h2>小・中・高等学校学習指導要領</h2><p>小・中学校の平成29年告示と、高等学校の平成30年告示の数学解説を参照しています。</p></article>
      <article><span>教材生成方針</span><h2>独自生成</h2><p>問題文、数値、選択肢はこのサイトのロジックで生成します。</p></article>
      <article><span>掲載単元数</span><h2>${units.length}単元</h2><p>小学1〜6年の算数・国語（漢字）・理科・漢検、中学数学、高校数学I・A・II・B・C・IIIを掲載しています。</p></article>
    </div>
  </section>`
}

function kanjiDataSource(){
  return `<section class="source-card" aria-labelledby="kanji-data-title">
    <h2 id="kanji-data-title">漢字データの出典とライセンス</h2>
    <p>国語教材の学年別漢字配当、音訓・例の基礎データは、以下の公開データを参照・加工して使用しています。</p>
    <ul class="reference-list">
      <li>
        <a href="https://github.com/mimneko/kanji-data" target="_blank" rel="noopener"><span>mimneko/kanji-data</span><i>教育漢字.csv・常用漢字表本表.json</i></a>
        <small>元データのライセンスはCC0 1.0 Universalです。本サイトでは教材用に選定・加工しています。</small>
        <a href="https://www.edrdg.org/kanjidic/kanjd2index_legacy.html" target="_blank" rel="noopener"><span>KANJIDIC2</span><i>教育漢字の画数・部首番号</i></a>
        <small>教育漢字1,026字に限定して抽出・加工しています。</small>
      </li>
      <li>
        <a href="https://creativecommons.org/publicdomain/zero/1.0/deed.ja" target="_blank" rel="noopener"><span>CC0 1.0 Universal</span><i>クリエイティブ・コモンズ</i></a>
        <small>元データの利用条件を確認できます。</small>
      </li>
    </ul>
  </section>`
}

function unitSources(){
  return `<section class="source-card" aria-labelledby="units-title">
    <h2 id="units-title">掲載単元</h2>
    ${units.map(u=>`<article class="unit-source">
      <div class="unit-chip">${gradeLabel(u.grade)} <span>${escapeHtml(u.area)}</span></div>
      <h2>${escapeHtml(u.unit)}</h2>
      <p>${escapeHtml(u.summary)}</p>
      <ul>${u.objectives.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>
    </article>`).join('')}
    <p class="notice">基準：小学校・中学校学習指導要領（平成29年告示）および各教科の解説。教材問題は独自に作成しています。</p>
  </section>`
}

function render(){
  root.innerHTML=`${offline()}${header()}<main class="page-shell about-page">
    <div class="page-title"><span class="eyebrow">CURRICULUM</span><h1>教材の基準と出典</h1><p>教材が何を基準に作られているか、どの資料を参照しているかを確認できます。</p></div>
    ${summaryCards()}
    ${referenceList()}
    ${kanjiDataSource()}
    ${unitSources()}
  </main>${footer()}`
}

async function start(){
  if('serviceWorker'in navigator)navigator.serviceWorker.register(new URL('../../sw.js',import.meta.url)).catch(()=>{})
  units=await loadUnitIndex()
  render()
}

start().catch(()=>root.textContent='教材データを読み込めませんでした。')
