#include "bt_slot.h"
#include "bt_bus.h"
#include "log.h"
#include <avr/pgmspace.h>
#include <string.h>

/* ---------------- строки AT-команд (во flash) -------------------------- */
static const char AT_PING[]     PROGMEM = "AT";
static const char AT_VER[]      PROGMEM = "AT+VER";
static const char AT_PROFILE[]  PROGMEM = "AT+PROFILE=";
static const char AT_PROFILE_Q[] PROGMEM = "AT+PROFILE";
static const char AT_NAME[]     PROGMEM = "AT+NAME=";
static const char AT_BAUD[]     PROGMEM = "AT+BAUD=";
static const char AT_REBOOT[]   PROGMEM = "AT+REBOOT";
static const char AT_SCAN_ON[]  PROGMEM = "AT+SCAN=1";
static const char AT_SCAN_OFF[] PROGMEM = "AT+SCAN=0";
static const char AT_CONN[]     PROGMEM = "AT+A2DPCONN=";
static const char AT_DISC[]     PROGMEM = "AT+A2DPDISC";
static const char AT_AUDIO[]    PROGMEM = "AT+A2DPAUDIO=1";
static const char AT_AUDROUTE[] PROGMEM = "AT+AUDROUTE=1";
static const char AT_STAT[]     PROGMEM = "AT+A2DPSTAT";
static const char AT_ENC[]      PROGMEM = "AT+A2DPENC";
static const char AT_CFG[]      PROGMEM = "AT+A2DPCFG=";
static const char AT_SPKVOL[]   PROGMEM = "AT+SPKVOL=";

static const char TOK_OK[]      PROGMEM = "OK";
static const char TOK_DEVSTAT[] PROGMEM = "+DEVSTAT";
static const char TOK_STAT[]    PROGMEM = "+A2DPSTAT=";
static const char TOK_SCAN[]    PROGMEM = "+SCAN";

/* ----------------------------------------------------------------------- */
static Slot g_slots[MAX_SLOTS];
static uint8_t g_count = MAX_SLOTS;
static uint8_t g_baud = 0;   /* 0 = неизвестно, иначе индекс в таблице */

static const uint32_t BAUD_TABLE[] PROGMEM = {115200, 57600, 38400, 19200, 9600};
#define BAUD_N (sizeof(BAUD_TABLE) / sizeof(BAUD_TABLE[0]))

static inline uint32_t baudAt(uint8_t idx) {
  uint32_t v;
  memcpy_P(&v, &BAUD_TABLE[idx], sizeof(v));
  return v;
}

const char* a2dpStateName(uint8_t st) {
  switch (st) {
    case A2DP_IDLE:       return "idle";
    case A2DP_CONNECTING: return "connecting";
    case A2DP_CONNECTED:  return "connected";
    case A2DP_STREAMING:  return "streaming";
    default:              return "?";
  }
}

const char* codecName(uint8_t c) {
  switch (c) {
    case 1:  return "SBC";
    case 3:  return "AAC";
    case 5:  return "aptX";
    case 7:  return "aptX-HD";
    case 8:  return "aptX-LL";
    case 9:  return "aptX-AD";
    case 10: return "LDAC";
    default: return "-";
  }
}

void slotsInit(uint8_t count) {
  if (count > MAX_SLOTS) count = MAX_SLOTS;
  g_count = count;
  for (uint8_t i = 0; i < MAX_SLOTS; i++) {
    g_slots[i].role      = (i == RX_SLOT) ? SLOT_SINK : SLOT_SOURCE;
    g_slots[i].health    = SLOT_NO_ANSWER;
    g_slots[i].a2dpState = A2DP_UNKNOWN;
    g_slots[i].enabled   = (i != RX_SLOT);
  }
}

uint8_t slotsCount() { return g_count; }
Slot&  slotRef(uint8_t i) { return g_slots[i < MAX_SLOTS ? i : 0]; }

/* --------------------------- авто-скорость ------------------------------ */
bool slotEnsureBaud(uint8_t i) {
  for (uint8_t b = 0; b < BAUD_N; b++) {
    uint32_t br = baudAt(b);
    btBus.setBaud(br);
    btBus.flushInput(20);
    char line[BT_LINE_MAX];
    for (uint8_t retry = 0; retry < 2; retry++) {
      btBus.sendP(i, AT_PING);
      if (btBus.waitFor(i, "OK", 250, line, sizeof(line))) {
        LOGI(PSTR("slot %d answered at %lu baud"), (int)i, (unsigned long)br);
        if (br != (uint32_t)BT_TARGET_BAUD) {
          /* Переводим модуль на рабочую скорость. Формат: AT+BAUD=<rate> */
          char param[12];
          snprintf(param, sizeof(param), "%lu", (unsigned long)BT_TARGET_BAUD);
          btBus.sendParamP(i, AT_BAUD, param);
          delay(120);
          btBus.setBaud(BT_TARGET_BAUD);
          btBus.flushInput(30);
          btBus.sendP(i, AT_PING);
          if (!btBus.waitFor(i, "OK", 400)) {
            LOGW(PSTR("slot %d did not switch to %lu"), (int)i,
                 (unsigned long)BT_TARGET_BAUD);
            btBus.setBaud(br);   /* вернулись на рабочую скорость модуля */
            return true;         /* работаем так, как умеем */
          }
          LOGI(PSTR("slot %d moved to %lu baud"), (int)i,
               (unsigned long)BT_TARGET_BAUD);
        }
        return true;
      }
    }
  }
  LOGW(PSTR("slot %d is silent on all baudrates"), (int)i);
  return false;
}

/* ------------------------------ опрос ----------------------------------- */
bool slotProbe(uint8_t i) {
  if (!slotEnsureBaud(i)) {
    g_slots[i].health = SLOT_NO_ANSWER;
    return false;
  }
  char line[BT_LINE_MAX];
  btBus.sendP(i, AT_VER);
  if (!btBus.waitFor(i, "+VER=", BT_CMD_TIMEOUT_MS, line, sizeof(line))) {
    g_slots[i].health = SLOT_ERROR;
    return false;
  }
  g_slots[i].health = SLOT_READY;
  LOGI(PSTR("slot %d: %s"), (int)i, line);
  return true;
}

/* ----------------------------- профиль ---------------------------------- */
bool slotSetRole(uint8_t i, SlotRole role) {
  uint16_t profile = 0;
  switch (role) {
    case SLOT_SINK:      profile = BT_PROFILE_SINK;     break;
    case SLOT_SOURCE:    profile = BT_PROFILE_SOURCE;   break;
    case SLOT_AURACAST:  profile = BT_PROFILE_SOURCE;   break; /* зависит от модуля */
    default:             return false;
  }

  /* Уже в нужном профиле? Не будем лишний раз перезагружать модуль. */
  char line[BT_LINE_MAX];
  btBus.sendP(i, AT_PROFILE_Q);
  uint16_t cur = 0xFFFF;
  if (btBus.waitFor(i, "+PROFILE=", BT_CMD_TIMEOUT_MS, line, sizeof(line))) {
    char* eq = strchr(line, '=');
    if (eq) cur = (uint16_t)atoi(eq + 1);
  } else {
    btBus.waitFor(i, "OK", 300);
  }

  g_slots[i].role = role;

  if (cur == profile) return true;

  char param[8];
  snprintf(param, sizeof(param), "%u", profile);
  btBus.sendParamP(i, AT_PROFILE, param);
  /* Смена профиля обычно перезагружает модуль. Ждём +DEVSTAT. */
  delay(BT_REBOOT_DELAY_MS);
  btBus.flushInput(50);
  btBus.sendP(i, AT_PING);
  bool ok = btBus.waitFor(i, "OK", 2500);
  if (!ok) {
    g_slots[i].health = SLOT_ERROR;
    LOGW(PSTR("slot %d: no answer after profile change"), (int)i);
  } else {
    g_slots[i].health = SLOT_READY;
  }
  return ok;
}

bool slotSetName(uint8_t i, const char* name) {
  char param[24];
  snprintf(param, sizeof(param), "%s,0", name);   /* ,0 = без суффикса адреса */
  btBus.sendParamP(i, AT_NAME, param);
  return btBus.waitFor(i, "OK", BT_CMD_TIMEOUT_MS);
}

bool slotSetCodec(uint8_t i, uint8_t mask) {
  char param[8];
  snprintf(param, sizeof(param), "%u", (unsigned)mask);
  btBus.sendParamP(i, AT_CFG, param);
  return btBus.waitFor(i, "OK", BT_CMD_TIMEOUT_MS);
}

/* ------------------------------ поиск ----------------------------------- */
bool slotScanStart(uint8_t i) {
  btBus.sendP(i, AT_SCAN_ON);
  return btBus.waitFor(i, "OK", BT_CMD_TIMEOUT_MS);
}

/*
 * Ожидаемое событие (зависит от прошивки): +SCAN=<mac>,<rssi>,<name>
 * Разбираем как "<12 hex>[,...]" -- имя берём до первой запятой после адреса.
 */
bool slotScanNext(uint8_t i, char* nameOut, uint8_t nameCap,
                  uint8_t macOut[6], uint16_t timeoutMs) {
  char line[BT_LINE_MAX];
  while (btBus.readLine(line, sizeof(line), timeoutMs)) {
    if (strncmp(line, "+SCAN=", 6) != 0) continue;
    const char* p = line + 6;
    if (!strToMac(p, macOut)) continue;
    p += 12;
    if (*p == ',') p++;
    /* пропускаем поле RSSI */
    const char* comma = strchr(p, ',');
    if (comma) p = comma + 1;
    uint8_t k = 0;
    while (p[k] && p[k] != ',' && k < nameCap - 1) k++;
    memcpy(nameOut, p, k);
    nameOut[k] = '\0';
    return true;
  }
  return false;
}

/* ---------------------------- соединение -------------------------------- */
bool slotConnect(uint8_t i, const uint8_t mac[6]) {
  char macStr[BT_MAC_STR_LEN];
  macToStr(mac, macStr);

  btBus.sendParamP(i, AT_CONN, macStr);
  if (!btBus.waitFor(i, "OK", BT_CMD_TIMEOUT_MS)) {
    LOGW(PSTR("slot %d: A2DPCONN rejected"), (int)i);
    return false;
  }
  /* Ждём перехода в connected */
  if (!btBus.waitFor(i, "+A2DPSTAT=3", BT_CONN_TIMEOUT_MS)) {
    LOGW(PSTR("slot %d: no +A2DPSTAT=3 for %s"), (int)i, macStr);
    return false;
  }
  memcpy(g_slots[i].peerMac, mac, 6);
  g_slots[i].a2dpState = A2DP_CONNECTED;
  g_slots[i].health    = SLOT_CONNECTED;
  return true;
}

bool slotStartAudio(uint8_t i) {
  /* В разных прошивках старт потока: AT+A2DPAUDIO=1 или AT+AUDROUTE=1.
     Пробуем оба, игнорируя ошибку первого. */
  btBus.sendP(i, AT_AUDIO);
  if (!btBus.waitFor(i, "OK", BT_CMD_TIMEOUT_MS)) {
    btBus.sendP(i, AT_AUDROUTE);
    btBus.waitFor(i, "OK", BT_CMD_TIMEOUT_MS);
  }
  if (btBus.waitFor(i, "+A2DPSTAT=5", BT_AUDIO_TIMEOUT_MS)) {
    g_slots[i].a2dpState = A2DP_STREAMING;
    g_slots[i].health    = SLOT_STREAMING;
    g_slots[i].codec     = slotReadCodec(i);
    return true;
  }
  return false;
}

void slotDisconnect(uint8_t i) {
  btBus.sendP(i, AT_DISC);
  btBus.waitFor(i, "OK", BT_CMD_TIMEOUT_MS);
  g_slots[i].a2dpState = A2DP_IDLE;
  g_slots[i].health    = g_slots[i].health == SLOT_NO_ANSWER ? SLOT_NO_ANSWER : SLOT_READY;
}

/* --------------------------- телеметрия --------------------------------- */
uint8_t slotReadA2dpState(uint8_t i) {
  char line[BT_LINE_MAX];
  btBus.sendP(i, AT_STAT);
  if (btBus.waitFor(i, "+A2DPSTAT=", BT_CMD_TIMEOUT_MS, line, sizeof(line))) {
    char* eq = strchr(line, '=');
    if (eq) g_slots[i].a2dpState = (uint8_t)atoi(eq + 1);
  }
  return g_slots[i].a2dpState;
}

uint8_t slotReadCodec(uint8_t i) {
  char line[BT_LINE_MAX];
  btBus.sendP(i, AT_ENC);
  if (btBus.waitFor(i, "+A2DPENC=", BT_CMD_TIMEOUT_MS, line, sizeof(line))) {
    char* eq = strchr(line, '=');
    if (eq) g_slots[i].codec = (uint8_t)atoi(eq + 1);
  }
  return g_slots[i].codec;
}

bool slotIsStreaming(uint8_t i) {
  return slotReadA2dpState(i) == A2DP_STREAMING;
}
