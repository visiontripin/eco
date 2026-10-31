# 06. AT-протокол модулей Feasycom

> Описание относится к модулям **FSC-BT1036 / BT955 / BT936B / BT909C /
> BT906 / BT1026 / BT806 / BT802 / BT1006**. У конкретной прошивки набор
> может отличаться — всегда начинайте с `AT+HELP`.

Документация: [FSC-BT1026 General Audio AT Command Set](https://document.feasycom.com/docs/audio/BT1026_EN/latest/BT1026_programming_user_guide.html),
[FSC-BT1036 User Instructions](https://document.feasycom.com/docs/audio/BT1036_EN/latest/user-instructions.html),
[FSC-FAQ](https://document.feasycom.com/docs/fsc-faq/EN/latest/_downloads/8e10f85f80d1b352ef7d3c4025f95320/FSC-FAQ.pdf).

## 6.1. Формат

**Команда:** `AT+Command{=Param1{,Param2}}<CR><LF>`

* все команды начинаются с `AT` и заканчиваются `0x0D 0x0A`;
* параметры после `=`, разделяются запятыми;
* ответ начинается и заканчивается `<CR><LF>`;
* результат всегда `OK` либо `ERROR`.

**Событие:** `<CR><LF>+Indication{=Param...}<CR><LF>` — приходит само,
без запроса. Именно события (например `+A2DPSTAT=5`) прошивка и ждёт.

**Настройки UART по умолчанию:** 115200, 8, N, 1.

## 6.2. Профили: битовая маска `AT+PROFILE`

| Бит | Значение | Вес |
|:--:|---|--:|
| 0 | SPP | 1 |
| 1 | GATT Server | 2 |
| 2 | GATT Client | 4 |
| 3 | HFP-HF (Hands-Free, роль «гарнитура») | 8 |
| 4 | HFP-AG (Audio Gateway, роль «труба») | 16 |
| 5 | **A2DP Sink** (приёмник) | 32 |
| 6 | **A2DP Source** (источник) | 64 |
| 7 | AVRCP Controller | 128 |
| 8 | AVRCP Target | 256 |
| 9 | HID | 512 |
| 10 | PBAP | 1024 |

Три маски, которые использует прошивка:

| Константа | Значение | Состав |
|---|--:|---|
| `BT_PROFILE_SINK` | **1195** | SPP + GATTS + HFP-HF + A2DP Sink + AVRCP CT + PBAP (1+2+8+32+128+1024) |
| `BT_PROFILE_SOURCE` | **339** | SPP + GATTS + HFP-AG + A2DP Source + AVRCP TG (1+2+16+64+256) |
| `BT_PROFILE_SRC_MIN` | **83** | SPP + GATTS + HFP-AG + A2DP Source (1+2+16+64) |

> **A2DP Sink и A2DP Source взаимно исключают друг друга.** Один модуль
> не может быть одновременно приёмником и передатчиком — поэтому хабу
> нужен минимум один отдельный модуль на приём
> [1](https://document.feasycom.com/docs/audio/BT1036_EN/latest/user-instructions.html).

Смена профиля обычно **перезагружает модуль** — после `AT+PROFILE=...`
нужно подождать ~1.2 с и заново послать `AT`.

## 6.3. Состояния A2DP (`+A2DPSTAT`)

| Код | Состояние | Что значит |
|:--:|---|---|
| 1 | idle | готов, соединения нет |
| 2 | connecting | идёт установление |
| 3 | **connected** | A2DP-соединение установлено |
| 4 | disconnecting | разъединяется |
| 5 | **streaming** | реально идёт аудиопоток |

Прошивка хаба опирается на `3` (линк есть) и `5` (звук идёт): именно так
собирается статистика «сколько колонок играет».

## 6.4. Команды, которые использует прошивка

| Команда | Назначение | Ответ / событие |
|---|---|---|
| `AT` | проверка связи | `OK` |
| `AT+VER` | версия прошивки | `+VER=BT1036,V2.6.1,20220922` |
| `AT+HELP` | сводка по функциям прошивки | многострочный текст |
| `AT+PROFILE` | прочитать профиль | `+PROFILE=1195` |
| `AT+PROFILE=<mask>` | задать профиль (ребут) | `OK`, затем `+DEVSTAT` |
| `AT+NAME=<name>,0` | имя BT-устройства (`,0` = без суффикса MAC) | `OK` |
| `AT+BAUD=<rate>` | скорость UART: 9600…921600 | `OK` (часто сразу переключается) |
| `AT+REBOOT` | программная перезагрузка | `OK` |
| `AT+I2SCFG=<mask>` | настройка I2S | `+I2SCFG=<mask>` |
| `AT+A2DPCFG=<mask>` | включить кодеки: BIT0 AAC, BIT1 aptX, BIT2 aptX-LL, BIT3 aptX-HD, BIT4 aptX-AD, BIT5 LDAC | `+A2DPCFG=<mask>` |
| `AT+SCAN=1` / `=0` | начать/остановить поиск | `OK`, события `+SCAN=...` |
| `AT+A2DPCONN=<MAC>` | соединиться (без параметра — к последнему) | `OK`, затем `+A2DPSTAT=3` |
| `AT+A2DPDISC` | разъединиться | `OK` |
| `AT+A2DPAUDIO=1` | **начать поток (только A2DP Source)** | `OK`, затем `+A2DPSTAT=5` |
| `AT+AUDROUTE=1` | альтернативный старт потока | `OK` |
| `AT+A2DPSTAT` | спросить состояние | `+A2DPSTAT=<n>` |
| `AT+A2DPENC` / `AT+A2DPDEC` | кодек энкодера / декодера | `+A2DPENC=<n>` |
| `AT+SPKVOL=+/-` | громкость аналогового выхода | `OK` |
| `AT+MICGAIN=+/-` | усиление аналогового входа | `OK` |
| `AT+PLAYPAUSE`, `AT+PLAY`, `AT+PAUSE` | AVRCP-управление плеером источника | `OK` |

Коды кодеков: `1` SBC, `3` AAC, `5` aptX, `7` aptX-HD, `8` aptX-LL,
`9` aptX-AD, `10` LDAC
[2](https://document.feasycom.com/docs/audio/BT1026_EN/latest/BT1026_programming_user_guide.html).

## 6.5. Типовые последовательности

### Инициализация слота-приёмника (SLOT 0)

```
  >> AT                          << OK
  >> AT+VER                      << +VER=BT1036,V2.6.1,20220922   << OK
  >> AT+PROFILE                  << +PROFILE=1195                 << OK
  >> AT+NAME=TWS-HUB,0           << OK
  >> AT+I2SCFG=1                 << +I2SCFG=1   << OK     (I2S master, 48k/16bit)
  >> AT+A2DPCFG=0                << OK                    (только SBC)
  << +A2DPSTAT=1                       готов, ждём телефон
  << +A2DPSTAT=5                       телефон подключился и играет
```

### Инициализация слота-передатчика (SLOT 1..N)

```
  >> AT                          << OK
  >> AT+PROFILE=339              << OK       (модуль уходит в ребут)
  ... пауза 1.2 с ...
  >> AT                          << OK
  >> AT+PROFILE                  << +PROFILE=339   << OK
  >> AT+I2SCFG=3                 << OK            (I2S slave, 48k/16bit)
  >> AT+A2DPCFG=0                << OK            (только SBC)
```

### Подключение колонки

```
  >> AT+SCAN=1                   << OK
  << +SCAN=AABBCCDDEEFF,-42,JBL Flip 6
  << +SCAN=112233445566,-67,Sony SRS-XB13
  >> AT+SCAN=0                   << OK
  >> AT+A2DPCONN=AABBCCDDEEFF    << OK
  << +A2DPSTAT=3                       линк поднят
  >> AT+A2DPAUDIO=1              << OK
  << +A2DPSTAT=5                       звук пошёл
  >> AT+A2DPENC                  << +A2DPENC=1     (SBC)
```

Именно такую последовательность (в неблокирующем виде) реализует
`audio_core.cpp`: `PH_PROBE → PH_CONN_WAIT → PH_CONN_CMD → PH_AUDIO_WAIT →
PH_AUDIO_CMD → PH_STREAM_WAIT`.

### Разъединение

```
  >> AT+A2DPDISC                 << OK
  << +A2DPSTAT=1
```

## 6.6. Настройка I2S: маска `AT+I2SCFG`

| Бит | 0 | 1 |
|:--:|---|---|
| 0 | I2S выключен | I2S включён |
| 1 | master | slave |
| 2 | 48 кГц | 44.1 кГц |
| 3 | left justified | right justified |
| 4 | data 1 bit delay | data no delay |
| 5–6 | 00 = 16 бит, 01 = 24 бита, 10 = 32 бита | |

Готовые значения: `1` = master/48k/16bit, `3` = slave/48k/16bit,
`65` = master/48k/32bit, `67` = slave/48k/32bit
[3](https://document.feasycom.com/docs/audio/BT1026_EN/latest/BT1026_programming_user_guide.html).

## 6.7. Грабли

| Симптом | Причина | Решение |
|---|---|---|
| `AT` молчит | не совпадает скорость | перебрать 9600…115200 (это делает `slotEnsureBaud()`) |
| Команды не парсятся | включён режим прозрачной передачи (`AT+TPMODE=1`) | `AT+TPMODE=0` |
| Нет `\r\n` на конце | модуль ждёт завершения строки | все команды отправляются с `\r\n` — в прошивке это есть |
| `AT+PROFILE` вернул `ERROR` | комбинация профилей недопустима (например sink+source) | использовать готовые маски 1195 / 339 |
| `+A2DPSTAT=3`, но звука нет | не запущен аудиопоток | `AT+A2DPAUDIO=1`, при ошибке — `AT+AUDROUTE=1` |
| Модуль отвечает на всё `OK`, но не соединяется | неправильный формат MAC | 12 hex-символов без разделителей, `AABBCCDDEEFF` |
| События `+SCAN=...` не приходят | формат зависит от прошивки | посмотреть глазами через USB-UART, поправить парсер в `slotScanNext()` |

## 6.8. Как посмотреть всё это глазами

До установки в хаб подключите модуль к USB-UART 3.3 В и откройте терминал
на 115200. Пройдите последовательности из 6.5 и **скопируйте реальные
ответы** — они понадобятся, если ваша прошивка отличается.

Дальше: [07 — интерфейс](07-ui.md).
