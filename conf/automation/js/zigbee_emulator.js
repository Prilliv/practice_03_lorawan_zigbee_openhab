// Zigbee mesh emulator: coordinator, routers, sleeping end devices and route repair.
const { rules, triggers, items } = require('openhab');
const { log } = require('@runtime');
const rand=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const upd=(n,v)=>items.getItem(n).postUpdate(String(v));
const nval=n=>{const v=Number(String(items.getItem(n).state));return Number.isFinite(v)?v:0;};
let router2Online=true, interference=false, joined=false, ticks=0;
let battery={s1:85,s2:92,s3:78,s4:100};
let lqi={r1:255,r2:230,r3:180,s1:200,s2:190,s3:165,s4:150};
function routes(router) {
  const active = router2Online ? ['coordinator','router_1','router_2','router_3','sensor_1','sensor_2','sensor_3'] : ['coordinator','router_1','router_3','sensor_1','sensor_2','sensor_3'];
  if(joined) active.push('sensor_4');
  return JSON.stringify({router, routes:active.filter(x=>x!==router).map(dest=>({destination:dest,next_hop:dest==='coordinator'?'coordinator':(dest==='router_3'&&!router2Online?'router_1':router==='router_3'?'router_2':'coordinator'),cost:Math.round(rand(1,5)+(interference?3:0)),status:(dest==='router_3'&&!router2Online&&router==='router_2')?'repairing':'active'}))});
}
function topology() {
  return JSON.stringify({pan_id:'0x1234',channel:11,coordinator:'00:12:4B:00:12:34:56:78',self_healing:!router2Online?'route repair active':'normal',devices:[
    {id:'router_1',role:'router',parent:'coordinator',ieee:'00:15:8D:00:01:23:45:67'},
    {id:'router_2',role:'router',parent:'coordinator',ieee:'00:15:8D:00:01:23:45:68',online:router2Online},
    {id:'router_3',role:'router',parent:router2Online?'router_2':'router_1',ieee:'00:15:8D:00:01:23:45:69'},
    {id:'sensor_1',role:'end_device',parent:'router_1',ieee:'00:15:8D:00:01:23:45:6A'},
    {id:'sensor_2',role:'end_device',parent:'router_1',ieee:'00:15:8D:00:01:23:45:6B'},
    {id:'sensor_3',role:'end_device',parent:'router_3',ieee:'00:15:8D:00:01:23:45:6C'},
    ...(joined?[{id:'sensor_4',role:'end_device',parent:'router_1',ieee:'00:15:8D:00:01:23:45:6D'}]:[])
  ]});
}
function updateMesh() {
  ticks++;
  lqi.r1=clamp(Math.round(255+rand(-8,0)-(interference?25:0)),0,255);
  lqi.r2=router2Online?clamp(Math.round(230+rand(-18,10)-(interference?30:0)),0,255):0;
  lqi.r3=clamp(Math.round((router2Online?180:145)+rand(-20,15)-(interference?30:0)),0,255);
  lqi.s1=clamp(Math.round(200+rand(-18,12)-(interference?25:0)),0,255);
  lqi.s2=clamp(Math.round(190+rand(-20,12)-(interference?25:0)),0,255);
  lqi.s3=clamp(Math.round((router2Online?165:145)+rand(-22,12)-(interference?25:0)),0,255);
  ['Router1Lqi','Router2Lqi','Router3Lqi'].forEach((name,i)=>upd(name,[lqi.r1,lqi.r2,lqi.r3][i]));
  upd('Router1Routes',routes('router_1')); upd('Router2Routes',routes('router_2')); upd('Router3Routes',routes('router_3'));
  upd('Router2Online',router2Online?'ON':'OFF');
  upd('Sensor1Temperature',(21+rand(-2.5,2.5)).toFixed(1)); upd('Sensor1Humidity',(48+rand(-12,12)).toFixed(1));
  battery.s1=clamp(battery.s1-0.015,0,100); battery.s2=clamp(battery.s2-(Math.random()<0.25?0.03:0.008),0,100); battery.s3=clamp(battery.s3-0.012,0,100);
  upd('Sensor1Battery',battery.s1.toFixed(1)); upd('Sensor2Battery',battery.s2.toFixed(1)); upd('Sensor3Battery',battery.s3.toFixed(1));
  upd('Sensor1Lqi',lqi.s1); upd('Sensor2Lqi',lqi.s2); upd('Sensor3Lqi',lqi.s3);
  upd('Sensor2Motion',Math.random()<(new Date().getHours()>6&&new Date().getHours()<22?0.3:0.1)?'ON':'OFF');
  upd('Sensor3LightLevel',new Date().getHours()>6&&new Date().getHours()<20?Math.round(rand(200,800)):Math.round(rand(0,50)));
  if(joined){battery.s4=clamp(battery.s4-0.01,0,100);upd('Sensor4Joined','ON');}
  const total=joined?7:6, offline=router2Online?0:1;
  upd('CoordinatorStatus',router2Online?'online; permit_join=true':'online; router_2 failed; route repair');
  upd('NetworkChannel',11);upd('PanId','0x1234');upd('DeviceCount',total-offline);
  upd('NetworkHealth',JSON.stringify({status:offline?'degraded; alternate route selected':'healthy',online_devices:total-offline,offline_devices:offline,network_quality:(100-(interference?20:0)-(offline?8:0)).toFixed(1)+'%',interference}));
  upd('ZigbeeTopology',topology());
}
rules.JSRule({
 name:'Zigbee mesh initialization', description:'Initialize coordinator and mesh nodes',
 triggers:[triggers.SystemStartlevelTrigger(100)],
 execute:()=>{upd('EmulationActive','ON');upd('NetworkChannel',11);upd('PanId','0x1234');upd('CoordinatorStatus','online');upd('Router2Online','ON');updateMesh();log.info('Zigbee mesh emulator initialized');}
});
rules.JSRule({
 name:'Zigbee mesh telemetry and self healing', description:'Update sensor telemetry, LQI and route tables',
 triggers:[triggers.GenericCronTrigger('0/20 * * * * ?')],
 execute:()=>{if(String(items.getItem('EmulationActive').state)!=='ON')return;updateMesh();}
});
rules.JSRule({
 name:'Zigbee scenario controls',
 triggers:[triggers.ItemCommandTrigger('SystemCommand')],
 execute:event=>{
  const cmd=event.itemCommand.toString();
  if(cmd==='FAIL_ROUTER_2'){router2Online=false;upd('FailureAnalysis','Router 2 failed: router_3 re-parented to router_1; routes recalculated');updateMesh();}
  if(cmd==='RECOVER_ROUTER_2'){router2Online=true;upd('FailureAnalysis','Router 2 recovered: preferred parent path restored');updateMesh();}
  if(cmd==='JOIN_SENSOR'){joined=true;upd('FailureAnalysis','New end device joined via router_1 (simulated network join)');updateMesh();}
  if(cmd==='INTERFERENCE'){interference=true;upd('FailureAnalysis','RF interference enabled: LQI and delivery quality reduced');updateMesh();}
  if(cmd==='NORMAL'){interference=false;upd('FailureAnalysis','Normal RF conditions');updateMesh();}
  if(cmd==='RESET'){router2Online=true;interference=false;joined=false;battery={s1:85,s2:92,s3:78,s4:100};upd('FailureAnalysis','Mesh scenario reset');updateMesh();}
 }
});
