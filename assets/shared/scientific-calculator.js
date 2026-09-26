const functions={sin:Math.sin,cos:Math.cos,tan:Math.tan,log10:Math.log10,ln:Math.log,sqrt:Math.sqrt}
export function calculateScientific(source,{radians=false}={}){
  let value=String(source).trim().replace(/[×＊*]/g,'*').replace(/[÷／/]/g,'/').replace(/[−－]/g,'-').replace(/π/g,'Math.PI').replace(/√/g,'sqrt')
  value=value.replace(/\^/g,'**').replace(/\blog\(/g,'log10(').replace(/\bln\(/g,'ln(')
  if(!/^[0-9+\-*/().,\sA-Za-z_]*$/.test(value))throw new Error('invalid')
  value=value.replace(/\b(sin|cos|tan|log10|ln|sqrt)\(/g,'functions.$1(')
  if(!/^[0-9+\-*/().,\sA-Za-z_.]*$/.test(value)||/(?:constructor|prototype|__)/.test(value))throw new Error('invalid')
  const trig=radians?functions:{...functions,sin:x=>Math.sin(x*Math.PI/180),cos:x=>Math.cos(x*Math.PI/180),tan:x=>Math.tan(x*Math.PI/180)}
  const result=Function('functions','Math',`"use strict"; return (${value})`)(trig,Math)
  if(!Number.isFinite(result))throw new Error('invalid')
  return Math.round((result+Number.EPSILON)*1e12)/1e12
}
