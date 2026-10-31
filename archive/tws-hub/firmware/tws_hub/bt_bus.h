/* =========================================================================
 * TWS-HUB -- bt_bus.h
 * Один UART на 8 BT-модулей:
 *   TX ардуино  -> 74HC4051 #1 (демультиплексор 1:8) -> RX модулей
 *   TX модулей  -> 74HC4051 #2 (мультиплексор 8:1)   -> RX ардуино
 * Обе микросхемы управляются одними и теми же линиями S0/S1/S2.
 * ========================================================================= */
#pragma once
#include "config.h"

class BtBus {
 public:
  void begin(unsigned long baud);

  /* Переключить мультиплексор и подождать установления сигнала. */
  void select(uint8_t slot);
  uint8_t selected() const { return _sel; }

  /* Команда без параметров. cmd_P -- строка из flash (PSTR). */
  void sendP(uint8_t slot, const char* cmd_P);
  /* Команда с параметром, параметр в RAM (например MAC). */
  void sendParamP(uint8_t slot, const char* cmd_P, const char* param);
  void sendRaw(uint8_t slot, const char* cmd);

  /* Считать одну строку ответа (до '\n'). Вернёт false при таймауте. */
  bool readLine(char* buf, uint8_t cap, uint16_t timeoutMs);

  /* Ждать появления подстроки token (из RAM) среди событий модуля. */
  bool waitFor(uint8_t slot, const char* token, uint16_t timeoutMs,
               char* lineBuf = 0, uint8_t cap = 0);

  void flushInput(uint16_t quietMs = 15);
  void setBaud(unsigned long baud);

 private:
  uint8_t _sel = 0xFF;
  void applySelect(uint8_t slot);
};

extern BtBus btBus;
