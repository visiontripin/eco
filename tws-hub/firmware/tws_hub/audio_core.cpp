#include "audio_core.h"
#include "bt_bus.h"
#include "bt_slot.h"
#include "speaker_db.h"
#include "log.h"
#include <avr/pgmspace.h>
#include <string.h>
#include <stdlib.h>

static const char C_AT[]     PROGMEM = "AT";
static const char C_PROF_Q[] PROGMEM = "AT+PROFILE";
static const char C_PROF[]   PROGMEM = "AT+PROFILE=";
static const char C_CONN[]   PROGMEM = "AT+A2DPCONN=";
static const char C_AUDIO[]  PROGMEM = "AT+A2DPAUDIO=1";
static const char C_ROUTE[]  PROGMEM = "AT+AUDROUTE=1";
static const char C_STAT[]   PROGMEM = "AT+A2DPSTAT";
static const char C_DISC[]   PROGMEM = "AT+A2DPDISC";
static const char C_NAME[]   PROGMEM = "AT+NAME=";
static const char C_CFG[]    PROGMEM = "AT+A2DPCFG=";

/* ------------------------- состояния задачи ------------------------------ */
static struct {
  Topology  topo      = TOPO_MULTI;
  bool      busy      = false;
  bool      fresh     = false;      /* фаза только началась, команда не послана */
  uint8_t   slot      = 0xFF;
  uint8_t   spkIdx    = 0xFF;       /* индекс текущей колонки в БД */
  uint8_t   cursor    = 0;          /* позиция в списке включённых колонок */
  CorePhase phase     = PH_IDLE;
  uint32_t  t0        = 0;
  uint16_t  timeout   = 0;
  uint8_t   retries   = 0;
  uint8_t   doneN     = 0;
  uint8_t   totalN    = 0;
  bool      sawError  = false;
  bool      sawToken  = false;
  char      token[14];
} g;

static uint32_t g_lastPoll   = 0;
static uint8_t  g_pollSlot   = 1;

/* ------------------------------ помощники -------------------------------- */
static void phaseEnter(CorePhase p, uint16_t timeoutMs) {
  g.phase   = p;
  g.fresh   = true;
  g.t0      = millis();
  g.timeout = timeoutMs;
  g.sawToken = false;
  g.sawError = false;
}

/*
 * Отдаёт накопленные строки модуля в текущей фазе и говорит, пора ли
 * переходить дальше. Неблокирующе.
 */
static bool pump(const char* token) {
  char line[BT_LINE_MAX];
  while (btBus.readLine(line, (uint8_t)sizeof(line), 0)) {
    if (token && strstr(line, token)) g.sawToken = true;
    if (strstr(line, "ERROR")) g.sawError = true;
    /* попутно ловим асинхронные события состояния */
    char* st = strstr(line, "+A2DPSTAT=");
    if (st && g.slot < MAX_SLOTS) {
      slotRef(g.slot).a2dpState = (uint8_t)atoi(st + 10);
      uint8_t s = slotRef(g.slot).a2dpState;
      slotRef(g.slot).health = (s == A2DP_STREAMING) ? (uint8_t)SLOT_STREAMING
                             : (s == A2DP_CONNECTED) ? (uint8_t)SLOT_CONNECTED
                             : (s == A2DP_IDLE)      ? (uint8_t)SLOT_READY
                                                     : slotRef(g.slot).health;
    }
  }
  if (g.sawToken) return true;
  if (g.sawError) return true;
  return false;
}

static bool pumpTimedOut() { return (millis() - g.t0) >= g.timeout; }

/* следующий включённыйSpeaker по списку БД, начиная с cursor */
static bool nextEnabledSpeaker(uint8_t from, uint8_t* outIdx, uint8_t* outCursor) {
  for (uint8_t i = from; i < dbCount(); i++) {
    if (dbIsEnabled(i)) { *outIdx = i; *outCursor = (uint8_t)(i + 1); return true; }
  }
  return false;
}

static uint8_t countEnabled() { return dbEnabledCount(); }

/* ============================ публичное API ============================== */
Topology audioCoreTopology() { return g.topo; }

void audioCoreSetTopology(Topology t) {
  if (g.topo == t) return;
  g.topo = t;
  LOGI(PSTR("topology -> %d"), (int)t);
  /* смену топологии применяем при следующем linkAll */
}

void audioCoreInit() {
  g.busy  = false;
  g.phase = PH_IDLE;
  g.slot  = 0xFF;

  /* Приёмник (слот 0) -- A2DP Sink, он же "лицо" хаба для телефона. */
  if (slotProbe(RX_SLOT)) {
    slotSetRole(RX_SLOT, SLOT_SINK);
    slotSetName(RX_SLOT, "TWS-HUB");
    slotRef(RX_SLOT).enabled = true;
  } else {
    LOGW(PSTR("RX slot is absent -- hub can only work from line-in"));
  }

  /* Передатчики */
  uint8_t n = 0;
  uint8_t idx = 0, cur = 0;
  while (nextEnabledSpeaker(cur, &idx, &cur)) {
    uint8_t slot = (g.topo == TOPO_MULTI) ? (uint8_t)(1 + n) : 1;
    if (slot >= MAX_SLOTS) break;
    if (slotProbe(slot)) {
      slotSetRole(slot, (g.topo == TOPO_AURACAST) ? SLOT_AURACAST : SLOT_SOURCE);
      slotRef(slot).enabled = true;
    }
    n++;
    if (g.topo != TOPO_MULTI) break;   /* dual/party/auracast -- один передатчик */
  }
  LOGI(PSTR("audio core ready: %d speaker(s) planned"), (int)n);
}

void audioCoreLinkAll() {
  if (g.busy) return;
  g.totalN = countEnabled();
  if (g.topo != TOPO_MULTI && g.totalN > 1) g.totalN = 1;
  if (g.totalN > (MAX_SLOTS - 1)) g.totalN = MAX_SLOTS - 1;

  if (g.totalN == 0) {
    LOGW(PSTR("no enabled speakers -- nothing to link"));
    return;
  }
  g.busy   = true;
  g.doneN  = 0;
  g.cursor = 0;
  g.retries = 0;
  LOGI(PSTR("link all: %d target(s)"), (int)g.totalN);
  phaseEnter(PH_PROBE, 1000);
}

void audioCoreUnlinkAll() {
  for (uint8_t s = 1; s < MAX_SLOTS; s++) {
    if (slotRef(s).enabled) slotDisconnect(s);
  }
  LOGI(PSTR("all links released"));
}

bool audioCoreBusy() { return g.busy; }

uint8_t audioCoreProgress() {
  if (!g.busy || g.totalN == 0) return 100;
  return (uint8_t)((uint16_t)g.doneN * 100 / g.totalN);
}

const char* audioCorePhaseText() {
  if (!g.busy) return "idle";
  switch (g.phase) {
    case PH_PROBE:      return "probe";
    case PH_ROLE:       return "role";
    case PH_CONN_CMD:   return "connect";
    case PH_CONN_WAIT:  return "wait link";
    case PH_AUDIO_CMD:  return "start";
    case PH_AUDIO_WAIT: return "wait audio";
    default:            return "...";
  }
}

uint8_t audioCoreLinked() {
  uint8_t n = 0;
  for (uint8_t s = 1; s < MAX_SLOTS; s++) {
    uint8_t st = slotRef(s).a2dpState;
    if (st == A2DP_CONNECTED || st == A2DP_STREAMING) n++;
  }
  return n;
}

uint8_t audioCoreStreaming() {
  uint8_t n = 0;
  for (uint8_t s = 1; s < MAX_SLOTS; s++)
    if (slotRef(s).a2dpState == A2DP_STREAMING) n++;
  return n;
}

uint8_t audioCoreRxState() { return slotRef(RX_SLOT).a2dpState; }

/* ============================ главный tick =============================== */
void audioCoreTick() {
  /* --- фоновая телеметрия, когда активной задачи нет ------------------- */
  if (!g.busy) {
    if (millis() - g_lastPoll > 3000) {
      g_lastPoll = millis();
      if (slotRef(g_pollSlot).enabled) {
        btBus.sendP(g_pollSlot, C_STAT);
        pump(0);
      }
      g_pollSlot++;
      if (g_pollSlot >= MAX_SLOTS) g_pollSlot = 1;
    } else {
      pump(0);   /* просто поддерживаем разбор асинхронных событий */
    }
    return;
  }

  /* --- выполнение плана подключения ------------------------------------ */
  switch (g.phase) {

    /* 1. Проверяем, что модуль в слоте живой ------------------------------ */
    case PH_PROBE: {
      uint8_t slot = (g.topo == TOPO_MULTI) ? (uint8_t)(1 + g.doneN) : 1;
      if (slot >= MAX_SLOTS) { phaseEnter(PH_DONE, 0); break; }
      g.slot = slot;
      if (g.fresh) { g.fresh = false; btBus.sendP(slot, C_AT); }
      if (pump("OK") || pumpTimedOut()) {
        if (g.sawToken) {
          slotRef(slot).health = SLOT_READY;
          /* сначала спросим состояние: вдруг линк уже поднят */
          phaseEnter(PH_CONN_WAIT, 400);
          btBus.sendP(slot, C_STAT);
          g.fresh = false;
        } else {
          LOGW(PSTR("slot %d silent"), (int)slot);
          slotRef(slot).health = SLOT_NO_ANSWER;
          g.doneN++;
          phaseEnter(PH_NEXT, 0);
        }
      }
      break;
    }

    /* 2. Уже соединён? Идём подключать ----------------------------------- */
    case PH_CONN_WAIT:
      /* этот шаг используем как "прочитать состояние перед подключением" */
      if (g.fresh) { g.fresh = false; }
      if (pump(0) || pumpTimedOut()) {
        uint8_t st = slotRef(g.slot).a2dpState;
        if (st == A2DP_STREAMING) { g.doneN++; phaseEnter(PH_NEXT, 0); }
        else if (st == A2DP_CONNECTED) { phaseEnter(PH_AUDIO_CMD, BT_CMD_TIMEOUT_MS); }
        else { phaseEnter(PH_CONN_CMD, BT_CMD_TIMEOUT_MS); }
      }
      break;

    /* 3. Выбираем колонку и шлём AT+A2DPCONN ----------------------------- */
    case PH_CONN_CMD: {
      if (g.fresh) {
        g.fresh = false;
        uint8_t idx, cur;
        /* для TOPO_DUAL/PARTY/AURACAST берём первую включённую колонку */
        uint8_t from = (g.topo == TOPO_MULTI) ? g.cursor : 0;
        if (!nextEnabledSpeaker(from, &idx, &cur)) { phaseEnter(PH_DONE, 0); break; }
        g.spkIdx = idx;
        g.cursor = cur;
        if (g.topo == TOPO_MULTI) g.slot = (uint8_t)(1 + g.doneN);

        SpeakerRec* r = dbGet(idx);
        char mac[BT_MAC_STR_LEN];
        macToStr(r->mac, mac);
        LOGI(PSTR("slot %d -> %s (%s)"), (int)g.slot, mac, r->name);
        btBus.sendParamP(g.slot, C_CONN, mac);
      }
      if (pump("OK") || pumpTimedOut()) {
        if (g.sawToken) phaseEnter(PH_AUDIO_WAIT, BT_CONN_TIMEOUT_MS);
        else {
          LOGW(PSTR("slot %d: A2DPCONN failed"), (int)g.slot);
          g.doneN++;
          phaseEnter(PH_NEXT, 0);
        }
      }
      break;
    }

    /* 4. Ждём +A2DPSTAT=3 (connected), потом =5 (streaming) --------------- */
    case PH_AUDIO_WAIT: {
      if (g.fresh) g.fresh = false;
      if (pump("+A2DPSTAT=3") || pumpTimedOut()) {
        if (g.sawToken) {
          slotRef(g.slot).health = SLOT_CONNECTED;
          SpeakerRec* r = dbGet(g.spkIdx);
          if (r) r->flags |= SPK_FLAG_SEEN;
          phaseEnter(PH_AUDIO_CMD, BT_CMD_TIMEOUT_MS);
        } else {
          LOGW(PSTR("slot %d: link timeout"), (int)g.slot);
          g.doneN++;
          phaseEnter(PH_NEXT, 0);
        }
      }
      break;
    }

    /* 5. AT+A2DPAUDIO=1 -> OK -------------------------------------------- */
    case PH_AUDIO_CMD: {
      if (g.fresh) {
        g.fresh = false;
        btBus.sendP(g.slot, C_AUDIO);
      }
      if (pump("OK") || pumpTimedOut()) {
        if (!g.sawToken) btBus.sendP(g.slot, C_ROUTE);   /* запасной вариант */
        phaseEnter(PH_STREAM_WAIT, BT_AUDIO_TIMEOUT_MS);
      }
      break;
    }

    /* 6. Ждём реального старта потока ------------------------------------ */
    case PH_STREAM_WAIT: {
      if (pump("+A2DPSTAT=5") || pumpTimedOut()) {
        if (g.sawToken) {
          slotRef(g.slot).health = SLOT_STREAMING;
          slotRef(g.slot).codec  = slotReadCodec(g.slot);
          LOGI(PSTR("slot %d streaming, codec=%s"), (int)g.slot,
               codecName(slotRef(g.slot).codec));
        } else {
          LOGW(PSTR("slot %d: no stream (state=%d)"), (int)g.slot,
               (int)slotRef(g.slot).a2dpState);
        }
        g.doneN++;
        phaseEnter(PH_NEXT, 0);
      }
      break;
    }

    /* 7. К следующему слоту ---------------------------------------------- */
    case PH_NEXT:
      if (g.doneN >= g.totalN) phaseEnter(PH_DONE, 0);
      else phaseEnter(PH_PROBE, 1000);
      break;

    case PH_DONE:
    default:
      LOGI(PSTR("link plan finished: %d/%d ok, streaming=%d"),
           (int)g.doneN, (int)g.totalN, (int)audioCoreStreaming());
      g.busy  = false;
      g.phase = PH_IDLE;
      g.slot  = 0xFF;
      break;
  }
}
