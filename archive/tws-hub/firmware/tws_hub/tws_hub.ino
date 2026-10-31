/* =========================================================================
 * TWS-HUB -- Bluetooth-хаб для нескольких BT-колонок
 * Прошивка управляющего контроллера (Arduino Nano Every / Nano / Uno / Mega)
 *
 * АРХИТЕКТУРА: Arduino НЕ трогает аудио. Она по UART (AT-команды) рулит
 * набором Bluetooth-модулей: один работает в роли A2DP Sink (принимает звук
 * от телефона/ТВ), остальные -- A2DP Source (раздают звук в колонки).
 * Аудио идёт между модулями по I2S или по аналогу, минуя микроконтроллер.
 *
 * Мультиплексор 74HC4051 (две штуки) позволяет обойтись одним UART на
 * 8 модулей: линии S0/S1/S2 выбирают, с кем мы сейчас говорим.
 *
 * Документация: ../../docs/
 * ========================================================================= */

#include "config.h"
#include "log.h"
#include "bt_bus.h"
#include "bt_slot.h"
#include "speaker_db.h"
#include "buttons.h"
#include "ui.h"
#include "menu.h"
#include "audio_core.h"

/* ------------------------- последовательная консоль ---------------------- */
#if TWSHUB_DEBUG
static void handleSerialCli() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    switch (c) {
      case '\r':
      case '\n':
        break;

      case 'h':
      case '?':
        Serial.println(F("TWS-HUB CLI"));
        Serial.println(F(" l  link all speakers"));
        Serial.println(F(" u  unlink all"));
        Serial.println(F(" s  scan (slot 1, 8s)"));
        Serial.println(F(" d  dump speaker db"));
        Serial.println(F(" p  probe every slot"));
        Serial.println(F(" t  dump slot states"));
        Serial.println(F(" 0..3 set topology"));
        Serial.println(F(" R  factory reset db"));
        break;

      case 'l': audioCoreLinkAll();    break;
      case 'u': audioCoreUnlinkAll();  break;

      case 's': {
        Serial.println(F("scanning..."));
        if (slotScanStart(1)) {
          char name[SPEAKER_NAME_LEN];
          uint8_t mac[6];
          uint32_t t0 = millis();
          while (millis() - t0 < 8000) {
            if (slotScanNext(1, name, (uint8_t)sizeof(name), mac, 1500)) {
              char ms[BT_MAC_STR_LEN];
              macToStr(mac, ms);
              Serial.print(F("  found "));
              Serial.print(ms);
              Serial.print(F("  "));
              Serial.println(name);
            }
          }
        }
        Serial.println(F("scan done"));
        break;
      }

      case 't': {
        for (uint8_t i = 0; i < MAX_SLOTS; i++) {
          Slot& s = slotRef(i);
          Serial.print(F("slot "));
          Serial.print(i);
          Serial.print(F("  role="));
          Serial.print(s.role);
          Serial.print(F("  health="));
          Serial.print(s.health);
          Serial.print(F("  a2dp="));
          Serial.print(a2dpStateName(s.a2dpState));
          Serial.print(F("  codec="));
          Serial.println(codecName(s.codec));
        }
        Serial.print(F("linked="));
        Serial.print(audioCoreLinked());
        Serial.print(F(" streaming="));
        Serial.println(audioCoreStreaming());
        break;
      }

      case 'p':
        for (uint8_t i = 0; i < MAX_SLOTS; i++) {
          Serial.print(F("probe slot "));
          Serial.print(i);
          Serial.print(F(" -> "));
          Serial.println(slotProbe(i) ? F("OK") : F("no answer"));
        }
        break;

      case 'd': {
        Serial.print(F("speakers: "));
        Serial.println(dbCount());
        for (uint8_t i = 0; i < dbCount(); i++) {
          SpeakerRec* r = dbGet(i);
          char ms[BT_MAC_STR_LEN];
          macToStr(r->mac, ms);
          Serial.print(F(" ["));
          Serial.print(i);
          Serial.print(F("] "));
          Serial.print(ms);
          Serial.print(F("  "));
          Serial.print(r->name);
          Serial.print(F("  en="));
          Serial.print((r->flags & SPK_FLAG_ENABLED) ? 1 : 0);
          Serial.print(F(" role="));
          Serial.print(r->role);
          Serial.print(F(" trim="));
          Serial.println(r->trimDb);
        }
        break;
      }

      case 'R':
        dbFactoryReset();
        Serial.println(F("db wiped"));
        break;

      case '0': audioCoreSetTopology(TOPO_DUAL);     Serial.println(F("topo=dual"));     break;
      case '1': audioCoreSetTopology(TOPO_MULTI);    Serial.println(F("topo=multi"));    break;
      case '2': audioCoreSetTopology(TOPO_PARTY);    Serial.println(F("topo=party"));    break;
      case '3': audioCoreSetTopology(TOPO_AURACAST); Serial.println(F("topo=auracast")); break;

      default:
        Serial.print(F("? unknown '"));
        Serial.print(c);
        Serial.println(F("' (h for help)"));
        break;
    }
  }
}
#endif

/* --------------------------------- setup --------------------------------- */
void setup() {
  logBegin(LOG_BAUD);
#if TWSHUB_DEBUG
  Serial.print(F("TWS-HUB fw "));
  Serial.println(F(TWS_HUB_VERSION));

#if TWSHUB_BOARD == BOARD_NANO_EVERY
  Serial.println(F("board: Arduino Nano Every (ATmega4809)"));
#elif TWSHUB_BOARD == BOARD_MEGA2560
  Serial.println(F("board: Arduino Mega 2560"));
#elif TWSHUB_BOARD == BOARD_NANO_HWUART
  Serial.println(F("board: Nano/Uno, hardware UART shared with BT bus"));
#else
  Serial.println(F("board: Arduino Nano/Uno (ATmega328P) + SoftwareSerial"));
#endif
#endif /* TWSHUB_DEBUG */

  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  uiInit();
  uiRowP(0, PSTR("TWS-HUB"));
  uiRowP(2, PSTR("booting..."));

  dbInit();

  btBus.begin(BT_TARGET_BAUD);
  slotsInit(MAX_SLOTS);

  buttonsInit();
  menuInit();

  audioCoreInit();

#if TWSHUB_DEBUG
  Serial.print(F("topo="));
  Serial.print((int)audioCoreTopology());
  Serial.println(F("  ready. press 'h' for CLI"));
#endif

  /* если колонки уже известны -- поднимаем линки сразу */
  if (dbEnabledCount() > 0) audioCoreLinkAll();
}

/* --------------------------------- loop ---------------------------------- */
static uint32_t g_lastBlink = 0;
static bool     g_led = false;

void loop() {
  buttonsTick();

  uint8_t id = 0, ev = 0;
  while (buttonsPoll(&id, &ev)) menuHandle(id, ev);

  audioCoreTick();

#if TWSHUB_DEBUG
  handleSerialCli();
#endif

  menuTick();

  /* мигалка: часто -- идёт подключение, редко -- дежурный режим */
  uint16_t period = audioCoreBusy() ? 200 : 1500;
  if (millis() - g_lastBlink > period) {
    g_lastBlink = millis();
    g_led = !g_led;
    digitalWrite(PIN_LED, g_led ? HIGH : LOW);
  }
}
