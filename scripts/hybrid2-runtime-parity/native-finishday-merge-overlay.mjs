// Load with "node --import ./.../native-finishday-merge-overlay.mjs <runner>".
// Compiler-only, test-isolated overlay of the exact pinned native Liftosaur source.
// No source code, real accounts, installed runtime files or production program changed.
import {createRequire} from 'node:module'
import path from 'node:path'
const runtime=process.env.LIFTOSAUR_RUNTIME_ROOT
if(!runtime)throw Error('LIFTOSAUR_RUNTIME_ROOT is required')
process.env.TS_NODE_TRANSPILE_ONLY ||= '1'
process.env.TS_NODE_PROJECT ||= path.join(runtime,'tsconfig.json')
const nativeRequire=createRequire(path.join(runtime,'runtime_api.cjs'))
nativeRequire('ts-node/register/transpile-only')
nativeRequire(path.join(runtime,'register-rn-web.js'))
const loader=nativeRequire.extensions['.ts']
let matched=0
nativeRequire.extensions['.ts']=function(module,filename){
  if(filename===path.join(runtime,'src/models/program.ts')){
    const compile=module._compile
    module._compile=function(js,file){
      const original='exercise.progress.state = Object.assign(Object.assign(Object.assign({}, exercise.progress.state), entry.state), state);'
      const corrected='exercise.progress.state = Object.assign(Object.assign(Object.assign({}, entry.state), exercise.progress.state), state);'
      if(js.split(original).length!==2)throw Error('Cannot identify unique frozen native state-merge expression')
      matched++
      return compile.call(this,js.replace(original,corrected),file)
    }
  }
  return loader(module,filename)
}
process.on('exit',()=>{if(matched!==1)process.stderr.write('NATIVE MERGE OVERLAY NOT LOADED EXACTLY ONCE: '+matched+'\n')})
