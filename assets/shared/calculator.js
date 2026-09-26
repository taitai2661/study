const operators=new Set(['+','-','×','÷'])

export function normalizeExpression(value=''){
  return String(value).replace(/[＊*]/g,'×').replace(/[／/]/g,'÷').replace(/\s+/g,'')
}

export function tokenize(expression){
  const value=normalizeExpression(expression)
  const tokens=[]
  let index=0
  while(index<value.length){
    const char=value[index]
    if(operators.has(char)||char==='('||char===')'){tokens.push(char);index++;continue}
    if(/[0-9.]/.test(char)){
      const match=value.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)/)
      if(!match)throw new Error('invalid')
      tokens.push(Number(match[0]))
      index+=match[0].length
      continue
    }
    throw new Error('invalid')
  }
  return tokens
}

export function calculate(expression){
  const tokens=tokenize(expression)
  let index=0
  const peek=()=>tokens[index]
  const take=()=>tokens[index++]
  const factor=()=>{
    if(peek()==='+'){take();return factor()}
    if(peek()==='-'){take();return -factor()}
    if(peek()==='('){
      take()
      const value=sum()
      if(take()!==')')throw new Error('invalid')
      return value
    }
    if(typeof peek()==='number')return take()
    throw new Error('invalid')
  }
  const product=()=>{
    let value=factor()
    while(peek()==='×'||peek()==='÷'){
      const operator=take(),right=factor()
      if(operator==='÷'&&right===0)throw new Error('divide-by-zero')
      value=operator==='×'?value*right:value/right
    }
    return value
  }
  const sum=()=>{
    let value=product()
    while(peek()==='+'||peek()==='-'){
      const operator=take(),right=product()
      value=operator==='+'?value+right:value-right
    }
    return value
  }
  if(!tokens.length)throw new Error('invalid')
  const result=sum()
  if(index!==tokens.length||!Number.isFinite(result))throw new Error('invalid')
  return result
}

export function formatNumber(value){
  if(!Number.isFinite(value))throw new Error('invalid')
  const rounded=Math.round((value+Number.EPSILON)*1e12)/1e12
  return String(rounded)
}

export function lastNumberRange(expression){
  const match=normalizeExpression(expression).match(/(?:^|[+\-×÷(])(-?(?:\d+(?:\.\d*)?|\.\d+))$/)
  if(!match)return null
  return {start:expression.length-match[1].length,end:expression.length,value:match[1]}
}
