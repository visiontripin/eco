/* =========================================================================
 * TWS-HUB -- bt_slot.h
 * Один BT-модуль Feasycom (FSC-BT1036C / BT1026 / BT966 / BT936 ...),
 * работающий в роли приёмника (A2DP Sink) или передатчика (A2DP Source).
 * ========================================================================= */
#pragma once
#include "config.h"

enum SlotRole : uint8_t {
  SLOT_OFF     = 0,
  SLOT_SINK    = 1,   /* принимает аудио от телефона/ТВ */
  SLOT_SOURCE  = 2,   /* отдаёт аудио в колонку */
  SLOT_AURACAST= 3    /* LE Audio BIS-передатчик (опционально) */
};

enum SlotHealth : uint8_t {
  SLOT_NO_ANSWER = 0,
  SLOT_READY     = 1,
  SLOT_CONNECTED = 2,
  SLOT_STREAMING = 3,
  SLOT_ERROR     = 4
};

struct Slot {
  uint8_t   role       = SLOT_OFF;
  uint8_t   health     = SLOT_NO_ANSWER;
  uint8_t   a2dpState  = A2DP_UNKNOWN;
  uint8_t   codec      = 0;      /* 1 SBC, 3 AAC, 5 APTX, 8 APTX-LL, 10 LDAC */
  uint8_t   peerMac[6] = {0,0,0,0,0,0};
  bool      enabled    = false;
};

/* --- жизненный цикл ---------------------------------------------------- */
void     slotsInit(uint8_t count);
uint8_t  slotsCount();
Slot&    slotRef(uint8_t i);

/* --- низкоуровневые операции ------------------------------------------- */
bool     slotProbe(uint8_t i);              /* AT -> OK, читает версию */
bool     slotEnsureBaud(uint8_t i);         /* автоопределение и перевод на BT_TARGET_BAUD */
bool     slotSetRole(uint8_t i, SlotRole role);
bool     slotSetName(uint8_t i, const char* name);
bool     slotSetCodec(uint8_t i, uint8_t codecMask);

/* --- соединение -------------------------------------------------------- */
bool     slotScanStart(uint8_t i);
bool     slotScanNext(uint8_t i, char* nameOut, uint8_t nameCap,
                      uint8_t macOut[6], uint16_t timeoutMs);
bool     slotConnect(uint8_t i, const uint8_t mac[6]);
bool     slotStartAudio(uint8_t i);
void     slotDisconnect(uint8_t i);

/* --- телеметрия -------------------------------------------------------- */
uint8_t  slotReadA2dpState(uint8_t i);      /* A2DP_* */
uint8_t  slotReadCodec(uint8_t i);
bool     slotIsStreaming(uint8_t i);

/* --- служебное --------------------------------------------------------- */
const char* a2dpStateName(uint8_t st);
const char* codecName(uint8_t c);
