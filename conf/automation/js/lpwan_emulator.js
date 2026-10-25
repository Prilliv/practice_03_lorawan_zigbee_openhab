// LoRaWAN star-network emulator. Synthetic model, not a radio stack.
const { rules, triggers, items } = require('openhab');
const { log } = require('@runtime');

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = name => {
  const s = items.getItem(name).state;
  const n = Number(String(s));
  return Number.isFinite(n) ? n : 0;
};
const update = (name, value) => items.getItem(name).postUpdate(String(value));
const devices = [
  { id:'SF7', sf:7, max:2000, interval:60, battery:'LoraSF7Battery', temp:'LoraSF7Temperature', hum:'LoraSF7Humidity', rssi:'LoraSF7Rssi', snr:'LoraSF7Snr', dist:'LoraSF7Distance', latency:'LoraSF7Latency', delivery:'LoraSF7Delivery', airtime:'LoraSF7Airtime', base:-80, drain:0.003 },
  { id:'SF9', sf:9, max:5000, interval:300, battery:'LoraSF9Battery', temp:'LoraSF9Temperature', hum:'LoraSF9Humidity', rssi:'LoraSF9Rssi', snr:'LoraSF9Snr', dist:'LoraSF9Distance', latency:'LoraSF9Latency', delivery:'LoraSF9Delivery', airtime:'LoraSF9Airtime', base:-100, drain:0.0015 },
  { id:'SF12', sf:12, max:15000, interval:900, battery:'LoraSF12Battery', temp:'LoraSF12Temperature', hum:'LoraSF12Humidity', rssi:'LoraSF12Rssi', snr:'LoraSF12Snr', dist:'LoraSF12Distance', latency:'LoraSF12Latency', delivery:'LoraSF12Delivery', airtime:'LoraSF12Airtime', base:-118, drain:0.0007 }
];
let ticks = 0, received = 0, lost = 0, dutyMs = 0, adrSf = 7;
let battery = { SF7:100, SF9:100, SF12:100 };
let interference = false;

function airtimeMs(sf, bytes=20) {
  // Simplified LoRa airtime approximation for educational comparison.
  const symbol = Math.pow(2, sf) / 125000;
  const payloadSymbols = 8 + Math.max(0, Math.ceil((8*bytes - 4*sf + 28 + 16) / (4*sf)) * 5);
  return (8 + 4.25) * symbol * 1000 + payloadSymbols * symbol * 1000;
}
function transmit(d) {
  const distance = rand(d.max * 0.25, d.max * 0.95);
  const rssi = d.base - 20*Math.log10(Math.max(0.1, distance/(d.max*0.25))) + rand(-4,4);
  const snr = (d.sf===7 ? 7 : d.sf===9 ? 0 : -12) + rand(-3,3) - (interference ? 5 : 0);
  const lossP = clamp(0.03 + (distance/d.max)*0.12 + (interference?0.25:0) + (snr < -8 ? 0.15:0), 0.01, 0.8);
  const ok = Math.random() >= lossP;
  const air = airtimeMs(d.sf);
  battery[d.id] = clamp(battery[d.id] - d.drain - air/10000000, 0, 100);
  update(d.battery, battery[d.id].toFixed(2));
  update(d.temp, (20 + rand(-4,7)).toFixed(1));
  update(d.hum, rand(35,75).toFixed(1));
  update(d.rssi, rssi.toFixed(1));
  update(d.snr, snr.toFixed(1));
  update(d.dist, distance.toFixed(0));
  update(d.latency, (air + rand(80,250) + (d.sf*10)).toFixed(0));
  update(d.delivery, ((1-lossP)*100).toFixed(1));
  update(d.airtime, air.toFixed(1));
  dutyMs += air;
  if (ok) received++; else lost++;
  update('PacketsReceived', received);
  update('PacketsLost', lost);
  update('LoRaPackets', JSON.stringify({device:d.id, sf:d.sf, distance_m:Math.round(distance), rssi_dbm:+rssi.toFixed(1), snr_db:+snr.toFixed(1), delivered:ok, payload_bytes:20, security:'AES-128 conceptual simulation'}));
  update('ApplicationData', JSON.stringify({device:d.id, temperature:items.getItem(d.temp).state.toString(), humidity:items.getItem(d.hum).state.toString(), received:ok}));
}
rules.JSRule({
  name: 'LoRaWAN emulator initialization',
  description: 'Initialize virtual gateway, server and devices',
  triggers: [triggers.SystemStartlevelTrigger(100)],
  execute: () => {
    update('EmulationActive','ON');
    update('GatewayStatus','online');
    update('NetworkStatus','operational; OTAA/ABP and AES-128 are conceptual states only');
    update('GatewayRssi',-32);
    update('GatewayLoad',12);
    update('GatewayTemperature',38);
    update('AdrStatus','ADR enabled; initial SF7 (simplified)');
    devices.forEach(d => { if (String(items.getItem(d.battery).state)==='NULL' || String(items.getItem(d.battery).state)==='UNDEF') update(d.battery,100); });
    log.info('LoRaWAN emulator initialized with 3 virtual end devices');
  }
});
rules.JSRule({
  name: 'LoRaWAN uplink transmissions',
  description: 'Generate SF7/SF9/SF12 uplinks with modeled airtime, RSSI/SNR and packet loss',
  triggers: [triggers.GenericCronTrigger('0/15 * * * * ?')],
  execute: () => {
    if (String(items.getItem('EmulationActive').state) !== 'ON') return;
    ticks++;
    devices.forEach(d => { if (ticks % Math.max(1, Math.round(d.interval/15))===0) transmit(d); });
    update('GatewayStatus','online; 3 virtual channels EU868: 868.1/868.3/868.5 MHz');
    update('GatewayLoad',rand(15,70).toFixed(1));
    update('GatewayTemperature',rand(35,50).toFixed(1));
    update('DutyCycleUsed',((dutyMs/3600000)*100).toFixed(4));
    update('ActiveDevices',devices.filter(d=>battery[d.id]>5).length);
    // ADR is intentionally simplified: after repeated good links choose a lower SF.
    if (num('LoraSF12Snr') > -5 && adrSf > 7) { adrSf--; update('AdrStatus',`ADR simulated: target SF${adrSf}`); }
    update('NetworkStatus',JSON.stringify({status:'operational',active_devices:devices.filter(d=>battery[d.id]>5).length,total_devices:3,packets_received:received,packets_lost:lost,delivery_pct:received+lost?+(100*received/(received+lost)).toFixed(1):100,server:'virtual Network Server'}));
  }
});
rules.JSRule({
  name: 'LoRaWAN interference command',
  triggers: [triggers.ItemCommandTrigger('SystemCommand')],
  execute: event => {
    if (event.itemCommand.toString()==='INTERFERENCE') {
      interference = true; update('ProtocolTest','Interference enabled for LoRaWAN and Zigbee');
    } else if (event.itemCommand.toString()==='RESET') {
      ticks=0; received=0; lost=0; dutyMs=0; battery={SF7:100,SF9:100,SF12:100}; interference=false;
      ['PacketsReceived','PacketsLost'].forEach(n=>update(n,0));
      devices.forEach(d=>update(d.battery,100));
      update('ProtocolTest','Counters and batteries reset');
    } else if (event.itemCommand.toString()==='NORMAL') {
      interference=false; update('ProtocolTest','Normal RF conditions');
    }
  }
});
