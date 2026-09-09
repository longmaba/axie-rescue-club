import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser=await chromium.launch({headless:true});
const report=[];
const rootRays=[{from:{x:-6,z:-3.2},to:{x:-2.4,z:-3.2}},{from:{x:-2.4,z:-3.2},to:{x:-2.4,z:2.4}},{from:{x:-2.4,z:2.4},to:{x:-6,z:2.4}}];
const exitRays=[...rootRays.slice(0,2),{from:{x:-2.4,z:2.4},to:{x:3.2,z:2.4}},{from:{x:3.2,z:2.4},to:{x:3.2,z:-3.2}}];
try {
  for(const level of ['bramblebrook','sunseed-orchard','moonbell-marsh']) {
    const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(`${process.env.ART_PREVIEW_URL??'http://127.0.0.1:5189'}/scripts/art/preview.html?level=${level}`);
    await page.waitForFunction(()=>window.artReady,undefined,{timeout:30000});
    const capture=async(name,state)=>{
      if(state)await page.evaluate(s=>window.setArtState(s),state);
      await page.waitForTimeout(1300);
      const path=`scripts/art/evidence/rework-${level}-${name}.png`;await page.screenshot({path});
      report.push({level,state:name,path,renderer:await page.evaluate(()=>window.artInfo)});
    };
    await capture('initial');
    if(level==='sunseed-orchard') {
      await capture('staging',{orchard:{pods:[{column:3,row:3},{column:4,row:2}],watered:[false,false],grown:[false,false],pushes:4}});
      await capture('watered',{orchard:{pods:[{column:5,row:1},{column:5,row:3}],watered:[true,true],grown:[false,false],pushes:10}});
      await capture('solved',{orchard:{pods:[{column:5,row:1},{column:5,row:3}],watered:[true,true],grown:[true,true],pushes:10},gate:true});
    } else if(level==='moonbell-marsh') {
      await capture('root-lit',{moonbeam:{powered:true,mirrors:[1,0,1],rooted:false},moonbeamView:{segments:rootRays,rootLit:true,exitLit:false}});
      await capture('rerouted',{moonbeam:{powered:true,mirrors:[1,1,1],rooted:true},moonbeamView:{segments:[...exitRays.slice(0,3),{from:{x:3.2,z:2.4},to:{x:3.2,z:5.6}}],rootLit:false,exitLit:false}});
      await capture('solved',{moonbeam:{powered:true,mirrors:[1,1,0],rooted:true},moonbeamView:{segments:exitRays,rootLit:false,exitLit:true},gate:true});
    } else await capture('built',{logRolled:true,bridge:true,bloom:true,gate:true,leafGrown:true,leafLaunched:true});
    report.push({level,errors});await page.close();
  }
  await writeFile('scripts/art/evidence/puzzle-rework-render-report.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
