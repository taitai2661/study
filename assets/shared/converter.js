const linear=factor=>({toBase:value=>value*factor,fromBase:value=>value/factor})
const unit=(id,label,factor,detail='')=>({id,label,detail,...linear(factor)})

export const CONVERSION_CATEGORIES=[
  {id:'length',label:'長さ',units:[
    unit('mm','mm',.001,'ミリメートル'),unit('cm','cm',.01,'センチメートル'),unit('m','m',1,'メートル'),unit('km','km',1000,'キロメートル'),
    unit('inch','inch',.0254,'インチ'),unit('ft','ft',.3048,'フィート'),unit('yd','yd',.9144,'ヤード'),unit('mile','mile',1609.344,'マイル')
  ]},
  {id:'area',label:'面積',units:[
    unit('mm2','mm²',1e-6,'平方ミリメートル'),unit('cm2','cm²',1e-4,'平方センチメートル'),unit('m2','m²',1,'平方メートル'),unit('km2','km²',1e6,'平方キロメートル'),
    unit('a','a',100,'アール'),unit('ha','ha',10000,'ヘクタール'),unit('in2','in²',.00064516,'平方インチ'),unit('ft2','ft²',.09290304,'平方フィート'),unit('acre','acre',4046.8564224,'エーカー')
  ]},
  {id:'volume',label:'体積・かさ',units:[
    unit('ml','mL',.001,'ミリリットル'),unit('cl','cL',.01,'センチリットル'),unit('dl','dL',.1,'デシリットル'),unit('l','L',1,'リットル'),
    unit('cm3','cm³',.001,'立方センチメートル'),unit('m3','m³',1000,'立方メートル'),unit('usfloz','US fl oz',.0295735295625,'米液量オンス'),
    unit('uscup','US cup',.2365882365,'米カップ'),unit('uspint','US pint',.473176473,'米パイント'),unit('usgallon','US gallon',3.785411784,'米ガロン')
  ]},
  {id:'mass',label:'重さ',units:[
    unit('mg','mg',1e-6,'ミリグラム'),unit('g','g',.001,'グラム'),unit('kg','kg',1,'キログラム'),unit('t','t',1000,'トン'),
    unit('oz','oz',.028349523125,'オンス'),unit('lb','lb',.45359237,'ポンド')
  ]},
  {id:'temperature',label:'温度',units:[
    {id:'c',label:'℃',detail:'摂氏',toBase:value=>value+273.15,fromBase:value=>value-273.15},
    {id:'f',label:'℉',detail:'華氏',toBase:value=>(value-32)*5/9+273.15,fromBase:value=>(value-273.15)*9/5+32},
    {id:'k',label:'K',detail:'ケルビン',toBase:value=>value,fromBase:value=>value}
  ]},
  {id:'time',label:'時間',units:[
    unit('ms','ms',.001,'ミリ秒'),unit('second','秒',1),unit('minute','分',60),unit('hour','時間',3600),unit('day','日',86400),unit('week','週',604800)
  ]},
  {id:'speed',label:'速度',units:[
    unit('mps','m/s',1,'メートル毎秒'),unit('kmh','km/h',1/3.6,'キロメートル毎時'),unit('mph','mph',.44704,'マイル毎時'),unit('knot','knot',1852/3600,'ノット')
  ]},
  {id:'data',label:'データ容量',units:[
    unit('bit','bit',1/8,'ビット'),unit('b','B',1,'バイト'),unit('kb','KB',1e3),unit('mb','MB',1e6),unit('gb','GB',1e9),unit('tb','TB',1e12),
    unit('kib','KiB',1024),unit('mib','MiB',1024**2),unit('gib','GiB',1024**3),unit('tib','TiB',1024**4)
  ]},
  {id:'pressure',label:'圧力',units:[
    unit('pa','Pa',1,'パスカル'),unit('hpa','hPa',100,'ヘクトパスカル'),unit('kpa','kPa',1000,'キロパスカル'),unit('mpa','MPa',1e6,'メガパスカル'),
    unit('bar','bar',1e5,'バール'),unit('atm','atm',101325,'標準気圧'),unit('psi','psi',6894.757293168,'重量ポンド毎平方インチ'),unit('mmhg','mmHg',133.322387415,'水銀柱ミリメートル')
  ]},
  {id:'energy',label:'エネルギー',units:[
    unit('j','J',1,'ジュール'),unit('kj','kJ',1000,'キロジュール'),unit('cal','cal',4.184,'カロリー'),unit('kcal','kcal',4184,'キロカロリー'),
    unit('wh','Wh',3600,'ワット時'),unit('kwh','kWh',3.6e6,'キロワット時'),unit('btu','BTU',1055.05585262,'英国熱量単位')
  ]}
]

export const getCategory=id=>CONVERSION_CATEGORIES.find(category=>category.id===id)

const comparison=(value,label,unit,description)=>({value,label,unit,description})
const COMPARISONS={
  length:[comparison(.15,'えんぴつ','約15cm','えんぴつ'),comparison(25,'学校のプール','約25m','学校のプールの長さ'),comparison(1000,'1km','1km','1km')],
  area:[comparison(.15,'ノート','約A5サイズ','ノート'),comparison(420,'バスケットコート','約420m²','バスケットコート'),comparison(10000,'1ヘクタール','1ha','1ヘクタール')],
  volume:[comparison(.2,'コップ1杯','約200mL','コップ1杯'),comparison(2,'ペットボトル','約2L','2Lペットボトル'),comparison(1000,'1立方メートル','1000L','1立方メートル')],
  mass:[comparison(.03,'たまご1個','約30g','たまご1個'),comparison(1,'1Lの水','約1kg','1Lの水'),comparison(1000,'小型車','約1t','小型車')],
  temperature:[comparison(273.15,'水がこおり始める温度','0℃','水がこおり始める温度'),comparison(293.15,'すごしやすい室温','20℃','すごしやすい室温'),comparison(373.15,'水が沸とうする温度','100℃','水が沸とうする温度')],
  time:[comparison(60,'1分','60秒','1分'),comparison(3600,'1時間','60分','1時間'),comparison(86400,'1日','24時間','1日')],
  speed:[comparison(1.4,'歩く速さ','約5km/h','歩く速さ'),comparison(27.8,'高速道路の車','約100km/h','高速道路の車'),comparison(343,'音の速さ','約時速1235km','音の速さ')],
  data:[comparison(1e6,'写真1枚','約1MB','写真1枚'),comparison(1e9,'動画約1時間','約1GB','動画約1時間'),comparison(1e12,'1TB','1000GB','1TB')],
  pressure:[comparison(101325,'標準気圧','約1気圧','標準気圧'),comparison(200000,'自転車のタイヤ','約2bar','自転車のタイヤ'),comparison(1000000,'10気圧','約10気圧','10気圧')],
  energy:[comparison(4184,'食パン1枚','約1kcal','食パン1枚ぶんのエネルギー'),comparison(3600000,'1kWh','1000Wh','1kWh'),comparison(10000000,'家庭の電気1日分','約10MJ','家庭の電気1日分')]
}
const compactNumber=value=>Number(value.toPrecision(3)).toLocaleString('ja-JP')

export function getComparison(categoryId,baseValue){
  if(typeof baseValue!=='number'||!Number.isFinite(baseValue)||baseValue<=0)return null
  const options=COMPARISONS[categoryId]
  if(!options)return null
  const reference=options.reduce((nearest,item)=>Math.abs(Math.log(baseValue/item.value))<Math.abs(Math.log(baseValue/nearest.value))?item:nearest)
  const ratio=baseValue/reference.value
  const ratioText=ratio>=1?`${compactNumber(ratio)}個分`:`約${compactNumber(1/ratio)}分の1`
  const percent=Math.max(4,Math.min(100,ratio*100))
  const description=categoryId==='temperature'?`これは ${reference.description}（${reference.unit}）に近い温度です。`:`これは ${reference.description}の${ratioText}です。`
  return {description,referenceLabel:`目安：${reference.label}（${reference.unit}）`,percent,ratio}
}

export function convert(value,categoryId,fromId,toId){
  if(typeof value!=='number'||!Number.isFinite(value))throw new Error('invalid-value')
  const category=getCategory(categoryId)
  const from=category?.units.find(candidate=>candidate.id===fromId)
  const to=category?.units.find(candidate=>candidate.id===toId)
  if(!category||!from||!to)throw new Error('invalid-unit')
  const result=to.fromBase(from.toBase(value))
  if(!Number.isFinite(result))throw new Error('result-out-of-range')
  return result
}

export function formatConversion(value){
  if(!Number.isFinite(value))throw new Error('invalid-value')
  if(Object.is(value,-0)||value===0)return'0'
  // 指数表記（例: 1.2e-13）は学習用の表示として読みにくいため、
  // 有効数字を保った通常の小数表記に統一する。
  return new Intl.NumberFormat('ja-JP',{useGrouping:false,maximumSignificantDigits:12}).format(value)
}
