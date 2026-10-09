# eco / TWS-HUB

Проект **TWS-HUB** — Bluetooth-хаб, к которому подключается несколько
Bluetooth-колонок, а сам хаб подключается к телефону или телевизору.

Управление — собственный дисплей и кнопки. Мозг — Arduino.

```
Телефон / ТВ  ──BT──▶  ┌───────────────────────────┐  ──BT──▶  Колонка 1
                       │        TWS-HUB            │  ──BT──▶  Колонка 2
                       │  Arduino + OLED + кнопки  │  ──BT──▶  Колонка 3
                       │  (звук идёт МИМО Arduino) │  ──BT──▶  ...
                       └───────────────────────────┘
```

## С чего читать

| Документ | О чём |
|---|---|
| **[tws-hub/README.md](tws-hub/README.md)** | Краткое резюме проекта и статус |
| **[docs/01-concept-and-limits.md](tws-hub/docs/01-concept-and-limits.md)** | **Прочитайте первым.** Что Arduino может, а чего нет — и почему «N независимых Bluetooth-линков» рассинхронны |
| **[docs/02-architecture.md](tws-hub/docs/02-architecture.md)** | 4 топологии, таблица выбора, блок-схемы |
| **[docs/03-bom.md](tws-hub/docs/03-bom.md)** | Что купить, конкретные модули и цены |
| **[docs/04-wiring.md](tws-hub/docs/04-wiring.md)** | Схема, распиновка, уровни 5 В ↔ 3.3 В |
| **[docs/05-sync-and-latency.md](tws-hub/docs/05-sync-and-latency.md)** | Бюджет задержек и математика рассинхрона |
| **[docs/06-at-protocol.md](tws-hub/docs/06-at-protocol.md)** | AT-команды Feasycom, последовательности |
| **[docs/07-ui.md](tws-hub/docs/07-ui.md)** | Дисплей, меню, кириллица |
| **[docs/08-bringup.md](tws-hub/docs/08-bringup.md)** | Пошаговый запуск и тесты |
| **[docs/09-faq-and-risks.md](tws-hub/docs/09-faq-and-risks.md)** | Грабли, риски, FAQ |
| **[firmware/tws_hub/](tws-hub/firmware/tws_hub/)** | Прошивка Arduino |

## Дисклеймер

Это инженерный проект, а не готовый продукт. Bluetooth-стек в железе —
штука капризная; конкретные AT-команды и их ответы зависят от прошивки
конкретного модуля. Всё, что можно было проверить без железа, проверено
(`tools/host_check/check.sh` — сборка и линковка прошивки с заглушками).
Первый запуск делайте по [docs/08-bringup.md](tws-hub/docs/08-bringup.md).
