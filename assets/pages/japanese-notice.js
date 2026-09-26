import {offline,footer,header} from '../shared/layout.js'
import {gradeFrom,gradeLabel} from '../shared/presentation.js'

const root=document.querySelector('#root')
const grade=gradeFrom(new URLSearchParams(location.search).get('grade'),1)
const webHref=`../web/?subject=${encodeURIComponent('国語')}&grade=${grade}`
const printHref=`../print/?subject=${encodeURIComponent('国語')}&grade=${grade}`

root.innerHTML=`${offline()}${header('../')}<main class="page-shell">
  <section class="friendly-error" aria-labelledby="notice-title">
    <span aria-hidden="true">i</span>
    <h1 id="notice-title">この国語教材は提供を終了しました</h1>
    <p>${gradeLabel(grade)}の国語では、十分な問題数を用意できる漢字の読み・書きを引き続き学べます。</p>
    <p>同じ音の漢字は、${grade>=4?'国語の単元一覧から選べます。':'高学年の国語教材で学べます。'}</p>
    <p><a class="button primary" href="${webHref}">Webで国語をまなぶ</a></p>
    <p><a class="button secondary" href="${printHref}">国語のプリントをつくる</a></p>
  </section>
</main>${footer('../')}`
