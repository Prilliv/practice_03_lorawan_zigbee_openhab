# План перевірки

1. **Завантаження**: після старту openHAB перевірити, що всі Items створилися і `EmulationActive=ON`.
2. **LoRaWAN**: протягом 1–2 хвилин `PacketsReceived` зростає; SF7 оновлюється частіше за SF9/SF12; є RSSI, SNR, airtime, battery.
3. **Gateway/Server**: `GatewayStatus=online`, змінюються load/temperature, `NetworkStatus` містить operational та лічильники.
4. **Zigbee**: LQI/телеметрія оновлюються, `ZigbeeTopology` містить coordinator, routers і sensors.
5. **Відмова**: команда `FAIL_ROUTER_2`; `Router2Online=OFF`, `NetworkHealth` показує degraded, topology має альтернативний parent.
6. **Відновлення**: `RECOVER_ROUTER_2`; router online та нормальний parent відновлено.
7. **Приєднання**: `JOIN_SENSOR`; `Sensor4Joined=ON`, у topology з'являється sensor_4.
8. **Перешкоди**: `INTERFERENCE`; LQI/доставка погіршуються. `NORMAL` повертає нормальні умови.
9. **Аналітика**: приблизно за хвилину змінюються середні значення та рекомендація в `ProtocolEfficiency`.
10. **Reset**: `RESET` повертає початковий стан і обнуляє лічильники LoRaWAN.

Команди відправляйте через Item `SystemCommand` (Send command) або через Selection у sitemap.
