import {offline,header,footer} from '../shared/layout.js'

const root=document.querySelector('#root')

function home(){
  return `<main class="home">
    <section class="home-intro">
      <div><span class="eyebrow">小学1年〜高校3年・算数／数学／国語／理科／漢検</span><h1>今日の「できた」を<br><em>つくろう。</em></h1><p>学び方はふたつ。紙に書いてじっくり取り組むか、画面でテンポよく問題に挑戦するか。算数・数学（高校数学I〜IIIまで）・国語の漢字・理科・漢検から、いまの気分に合う学び方をえらべます。</p></div>
      <div class="home-equation" aria-label="1たす1は3"><span>1</span><b>＋</b><span>1</span><b>＝</b><strong>3</strong></div>
    </section>
    <section class="learning-paths" aria-labelledby="paths-title"><div class="home-section-heading"><span>CHOOSE YOUR WAY</span><h2 id="paths-title">どうやって学ぶ？</h2></div><div class="path-grid"><a class="path-card teacher-card" href="print/"><span class="path-number">01</span><span class="path-icon" aria-hidden="true">✎</span><small>算数（中学では数学）・国語の漢字・理科・漢検からえらべる</small><strong>プリントをつくる</strong><span>教科、学年、単元をえらんで、<br>自分だけの問題プリントを作成。</span><b>教科をえらぶ <i>→</i></b></a><a class="path-card learner-card" href="web/"><span class="path-number">02</span><span class="path-icon" aria-hidden="true">◎</span><small>算数（中学では数学）・国語の漢字・理科・漢検からえらべる</small><strong>Webでまなぶ</strong><span>教科と単元をえらんで、<br>その場で答え合わせ。</span><b>教科をえらぶ <i>→</i></b></a></div></section>
    <section class="home-tools"><section class="home-tool"><div><span>STUDY TOOL</span><h2>計算の答えをたしかめよう</h2><p>小数やかっこを使った計算もできる、学習用のでんたくです。</p></div><a href="calculator/" class="home-tool-link"><b aria-hidden="true">＋</b><strong>でんたくをひらく</strong><i>→</i></a></section><section class="home-tool converter-home-tool"><div><span>STUDY TOOL</span><h2>いろいろな単位を変換しよう</h2><p>長さ、重さ、温度など10種類の単位をすぐに換算できます。</p></div><a href="converter/" class="home-tool-link"><b aria-hidden="true">⇄</b><strong>単位変換をひらく</strong><i>→</i></a></section></section>
    <section class="home-note"><span>PRINT & WEB</span><div class="home-note-copy"><p>どちらも登録なしで、すぐにはじめられます。</p><p>教育目的・個人利用では自由に利用できます。</p></div></section>
  </main>`
}

async function start(){
  if('serviceWorker'in navigator)navigator.serviceWorker.register(new URL('../../sw.js',import.meta.url)).catch(()=>{})
  const legacyPrint=location.hash.match(/^#\/?print(?:\?(.*))?$/)
  if(legacyPrint){location.replace(`${new URL('../print/',import.meta.url)}${legacyPrint[1]?`?${legacyPrint[1]}`:''}`);return}
  if(/^#\/?about\/?$/.test(location.hash)){location.replace(new URL('../about/',import.meta.url));return}
  root.innerHTML=`${offline()}${header('./','home')}${home()}${footer('./')}`
}

start().catch(()=>root.textContent='ページを読み込めませんでした。')
