// Cross-protocol metrics and protocol-selection recommendation.
const { rules, triggers, items } = require('openhab');
const { log } = require('@runtime');
const num=name=>{const x=Number(String(items.getItem(name).state));return Number.isFinite(x)?x:0;};
const upd=(n,v)=>items.getItem(n).postUpdate(String(v));
rules.JSRule({
 name:'LPWAN vs Mesh analytics',
 description:'Calculate battery, link quality, delivery, latency and scenario recommendations',
 triggers:[triggers.GenericCronTrigger('0 * * * * ?')],
 execute:()=>{
  if(String(items.getItem('EmulationActive').state)!=='ON')return;
  const lb=[num('LoraSF7Battery'),num('LoraSF9Battery'),num('LoraSF12Battery')];
  const lr=[num('LoraSF7Rssi'),num('LoraSF9Rssi'),num('LoraSF12Rssi')];
  const ld=[num('LoraSF7Delivery'),num('LoraSF9Delivery'),num('LoraSF12Delivery')];
  const ll=[num('LoraSF7Latency'),num('LoraSF9Latency'),num('LoraSF12Latency')];
  const zb=[num('Sensor1Battery'),num('Sensor2Battery'),num('Sensor3Battery')];
  const zl=[num('Sensor1Lqi'),num('Sensor2Lqi'),num('Sensor3Lqi')];
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const lba=avg(lb), zba=avg(zb), lra=avg(lr), zla=avg(zl), lda=avg(ld), lla=avg(ll);
  const zDelivery=String(items.getItem('NetworkHealth').state).includes('degraded')?82:96;
  const zLatency=String(items.getItem('NetworkHealth').state).includes('degraded')?240:120;
  upd('LoRaAvgBattery',lba.toFixed(2));upd('ZigbeeAvgBattery',zba.toFixed(2));
  upd('LoRaAvgRssi',lra.toFixed(1));upd('ZigbeeAvgLqi',zla.toFixed(1));
  upd('LoRaDeliveryRate',lda.toFixed(1));upd('ZigbeeDeliveryRate',zDelivery);
  upd('LoRaAvgLatency',lla.toFixed(0));upd('ZigbeeAvgLatency',zLatency);
  const batteryWinner=lba>zba?'LoRaWAN (модель)':zba>lba?'Zigbee (модель)':'рівність';
  const recommendation=(zla<100||String(items.getItem('NetworkHealth').state).includes('degraded'))?
    'LoRaWAN для віддалених/резервних датчиків; перевірити стан mesh':
    'LoRaWAN для великої відстані та малих повідомлень; Zigbee для локальної mesh-автоматизації';
  upd('ProtocolEfficiency',JSON.stringify({battery_winner:batteryWinner,delivery_lorawan_pct:lda.toFixed(1),delivery_zigbee_model_pct:zDelivery,latency_lorawan_ms:lla.toFixed(0),latency_zigbee_model_ms:zLatency,recommendation}));
  upd('CoverageAnalysis','LoRaWAN: навчальні профілі 2/5/15 км; Zigbee: mesh розширює покриття через routers. Реальний радіус залежить від середовища.');
  if(String(items.getItem('NetworkHealth').state).includes('degraded'))upd('FailureAnalysis','Mesh деградована: перевірте router 2 та альтернативний маршрут.');
  log.info('Protocol analytics refreshed');
 }
});
