# Практична робота 3.2 — LoRaWAN та Zigbee в openHAB 5

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

## Запуск через Docker (рекомендований варіант)

Потрібні Windows 10/11 із Docker Desktop, увімкнений WSL 2/контейнери Linux і доступ до інтернету для першого завантаження образу. Не потрібно встановлювати Java чи openHAB окремо. У `conf/services/addons.cfg` уже задані JavaScript Scripting і Basic UI.

1. Розпакуйте архів у звичайну папку, наприклад `D:\Projects\practice_03_lorawan_zigbee_openhab`. Не запускайте проєкт безпосередньо всередині ZIP.
2. Запустіть Docker Desktop і дочекайтеся стану **Running**.
3. Відкрийте PowerShell у кореневій папці проєкту (там, де `compose.yaml`) і виконайте:

   ```powershell
   docker compose up -d
   ```

   Або скористайтеся скриптом `scripts\docker-up.ps1`. Під час першого запуску Docker завантажить образ openHAB 5.2.1; ініціалізація може тривати кілька хвилин.
4. Перевірте запуск:

   ```powershell
   docker compose ps
   docker compose logs -f openhab
   ```

   Для виходу з перегляду логів натисніть `Ctrl+C` — це не зупиняє контейнер.
5. Відкрийте `http://localhost:8080`. При першому запуску завершіть початкове налаштування openHAB, якщо інтерфейс його запропонує.
6. Відкрийте **Settings → Items** і перевірте `EmulationActive`, `GatewayStatus`, `LoraSF7Battery`, `CoordinatorStatus`, `Router1Lqi`, `NetworkHealth` та `ProtocolEfficiency`. Для sitemap відкрийте `http://localhost:8080/basicui/app?sitemap=lpwan_mesh`.
7. Якщо add-on ще завантажується, зачекайте 1–3 хвилини й перегляньте логи.

### Керування Docker

Команди виконуйте в папці з `compose.yaml`:

```powershell
# Перегляд стану
docker compose ps

# Логи в реальному часі
docker compose logs -f --tail=200 openhab

# Перезапуск
docker compose restart openhab

# Зупинка без видалення даних
docker compose down

# Оновлення/повторне завантаження образу й запуск
docker compose pull
docker compose up -d
```

Скрипти-обгортки доступні в `scripts\docker-up.ps1`, `scripts\docker-down.ps1` і `scripts\docker-logs.ps1`. Дані openHAB зберігаються у Docker named volumes; конфігурація проєкту монтується з локальної папки `conf`. **Не використовуйте `docker compose down -v`, якщо хочете зберегти userdata/add-ons.**

За замовчуванням порти `8080` (HTTP) і `8443` (HTTPS) мають бути вільними. Якщо 8080 зайнятий, змініть ліву частину запису `"8080:8080"` у `compose.yaml`, наприклад на `"8081:8080"`, і тоді відкривайте `http://localhost:8081`.

## Альтернативний запуск без Docker

Якщо у вас уже є встановлений openHAB 5.x, можна скопіювати вміст `conf` до каталогу конфігурації та встановити add-on **JavaScript Scripting**. Для класичного sitemap потрібен Basic UI.

## Встановлення на Windows

1. Розпакуйте архів.
2. Знайдіть директорію конфігурації openHAB. У типовому Windows-інсталяційному варіанті це `C:\openHAB\conf`; якщо у вас інший шлях, використайте його.
3. Скопіюйте **вміст папки `conf` з архіву** до `C:\openHAB\conf`, зберігаючи підпапки. Якщо openHAB у `F:\openHAB`, скопіюйте до `F:\openHAB\conf`.
4. Відкрийте openHAB UI → Settings → Add-ons → Automation → встановіть **JavaScript Scripting** (якщо ще не встановлено).
5. Дочекайтеся завантаження конфігурації. Перевірте `openhab.log` на помилки.
6. У Main UI → Settings → Items знайдіть `EmulationActive`, `SystemCommand`, `LoraSF7Battery`, `NetworkHealth` тощо. `EmulationActive` має бути `ON`.
7. Для керування відправте команду до Item `SystemCommand`: `NORMAL`, `FAIL_ROUTER_2`, `RECOVER_ROUTER_2`, `JOIN_SENSOR`, `INTERFERENCE` або `RESET`.
8. Для sitemap відкрийте `http://localhost:8080/basicui/app?sitemap=lpwan_mesh` (Basic UI має бути встановлений).

### Зручне встановлення через PowerShell

Запустіть PowerShell **від імені користувача, який має доступ до каталогу openHAB**, перейдіть у розпаковану папку й виконайте:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\install-windows.ps1 -OpenHabConf "F:\openHAB\conf"
```

Замініть шлях на фактичну папку `conf`. Скрипт створює резервні копії файлів, які перезаписує.

## Як показати роботу викладачу

1. Відкрийте Items у Main UI і покажіть показники LoRaWAN, Zigbee та Protocol Comparison.
2. Зачекайте 1–2 хвилини: телеметрія змінюється автоматично.
3. Установіть `SystemCommand` у `FAIL_ROUTER_2`: вузол/маршрут позначається недоступним, mesh виконує спрощене відновлення.
4. Встановіть `RECOVER_ROUTER_2`, потім `JOIN_SENSOR` і `INTERFERENCE`; покажіть зміну LQI/доставки.
5. Поясніть, що показники є моделлю для навчання, а не вимірюванням реального радіоефіру.

## Важливі примітки

- Дистанції SF7=2 км, SF9=5 км і SF12=15 км — навчальні припущення з методички, а не гарантія реального радіуса.
- У LoRaWAN реальні duty-cycle обмеження залежать від піддіапазону та регіональних правил; 1% тут моделюється як навчальний ліміт.
- AES-128, OTAA/ABP, клас A/B/C та ADR у цьому проєкті описані/представлені спрощеними станами; справжнє криптографічне шифрування та процедуру join радіостека емулятор не виконує.
- Не використовуйте ці синтетичні цифри як інженерний прогноз покриття або енергоспоживання.
