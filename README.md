# Практична робота 3.2 LoRaWAN та Zigbee

Проєкт реалізує **емуляцію**, а не справжню радіомережу. Фізичні LoRaWAN/Zigbee пристрої та радіомодулі не потрібні. Усі вимірювання синтетичні й генеруються правилами JavaScript у openHAB.

## Що реалізовано

- LoRaWAN star-подібна модель: віртуальний gateway, три end devices SF7/SF9/SF12, uplink-пакети, RSSI/SNR, втрати пакетів, батарея, airtime, duty-cycle лічильник, спрощена ADR, Network/Application Server стани.
- Zigbee mesh: coordinator, три routers і три end devices; parent/child зв'язки, LQI, маршрутні таблиці, приєднання вузла, відмова router та відновлення маршруту.
- Порівняльна аналітика: середня батарея, RSSI/LQI, успішність доставки, затримка, активні вузли, рекомендація протоколу.
- Сценарії керування через `SystemCommand`: `NORMAL`, `FAIL_ROUTER_2`, `RECOVER_ROUTER_2`, `JOIN_SENSOR`, `INTERFERENCE`, `RESET`.
- `EmulationActive` вимикає/вмикає симуляцію.

## Структура

```text
conf/
  items/lpwan_mesh.items
  automation/js/lpwan_emulator.js
  automation/js/zigbee_emulator.js
  automation/js/protocol_analytics.js
  sitemaps/lpwan_mesh.sitemap
scripts/
  install-windows.ps1
  check-project.ps1
docs/
  protocol-notes.md
  test-plan.md
```
