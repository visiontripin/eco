#include "bt_bus.h"
#include "log.h"
#include <avr/pgmspace.h>

#if !BT_UART_HARDWARE
  #include <SoftwareSerial.h>
  SoftwareSerial BT_PORT(BT_RX_PIN, BT_TX_PIN);
#endif

BtBus btBus;

void BtBus::begin(unsigned long baud) {
  pinMode(PIN_MUX_S0, OUTPUT);
  pinMode(PIN_MUX_S1, OUTPUT);
  pinMode(PIN_MUX_S2, OUTPUT);
  _sel = 0xFF;
  select(0);
  BT_PORT.begin(baud);
#if BT_UART_HARDWARE
  /* на всякий случай: у Serial1 таймаут по умолчанию 1000 мс -- многовато */
  BT_PORT.setTimeout(100);
#endif
}

void BtBus::applySelect(uint8_t slot) {
  digitalWrite(PIN_MUX_S0, (slot >> 0) & 1);
  digitalWrite(PIN_MUX_S1, (slot >> 1) & 1);
  digitalWrite(PIN_MUX_S2, (slot >> 2) & 1);
}

void BtBus::select(uint8_t slot) {
  if (slot >= MAX_SLOTS) slot = MAX_SLOTS - 1;
  if (slot == _sel) return;
  applySelect(slot);
  _sel = slot;
  /* аналоговый ключ переключается за десятки нс, пауза -- для надёжности */
  delayMicroseconds(50);
  flushInput();
}

void BtBus::flushInput(uint16_t quietMs) {
  uint32_t t0 = millis();
  while (millis() - t0 < (uint32_t)quietMs) {
    while (BT_PORT.available()) BT_PORT.read();
    delay(1);
  }
}

void BtBus::setBaud(unsigned long baud) {
  BT_PORT.flush();
#if BT_UART_HARDWARE
  BT_PORT.begin(baud);
#else
  static_cast<SoftwareSerial&>(BT_PORT).begin(baud);
#endif
  delay(30);
}

void BtBus::sendRaw(uint8_t slot, const char* cmd) {
  select(slot);
  BT_PORT.print(cmd);
  BT_PORT.print('\r');
  BT_PORT.print('\n');
  LOGD(PSTR("s%d <- %s"), (int)slot, cmd);
}

void BtBus::sendP(uint8_t slot, const char* cmd_P) {
  char tmp[40];
  strncpy_P(tmp, cmd_P, sizeof(tmp) - 1);
  tmp[sizeof(tmp) - 1] = '\0';
  sendRaw(slot, tmp);
}

void BtBus::sendParamP(uint8_t slot, const char* cmd_P, const char* param) {
  char tmp[48];
  strncpy_P(tmp, cmd_P, sizeof(tmp) - 1);
  tmp[sizeof(tmp) - 1] = '\0';
  size_t n = strlen(tmp);
  size_t room = sizeof(tmp) - n - 1;
  strncpy(tmp + n, param, room);
  tmp[sizeof(tmp) - 1] = '\0';
  sendRaw(slot, tmp);
}

/*
 * timeoutMs == 0 -> "слить" всё, что уже лежит в приёмном буфере, и выйти.
 * Это неблокирующий режим, им пользуется audio_core, чтобы не морозить UI.
 */
bool BtBus::readLine(char* buf, uint8_t cap, uint16_t timeoutMs) {
  uint32_t t0 = millis();
  uint8_t i = 0;
  buf[0] = '\0';
  do {
    while (BT_PORT.available()) {
      int c = BT_PORT.read();
      if (c < 0) break;
      if (c == '\n') {
        while (i > 0 && (buf[i - 1] == '\r' || buf[i - 1] == ' ')) buf[--i] = '\0';
        buf[i] = '\0';
        if (i == 0) continue;             /* пустая строка -- ждём дальше */
        LOGD(PSTR("s%d -> %s"), (int)_sel, buf);
        return true;
      }
      if (c == '\r') continue;
      if (i < cap - 1) buf[i++] = (char)c;
      else i = 0;                          /* переполнение: сбрасываем */
    }
    if (millis() - t0 >= (uint32_t)timeoutMs) break;
  } while (millis() - t0 < (uint32_t)timeoutMs);
  return false;
}

bool BtBus::waitFor(uint8_t slot, const char* token, uint16_t timeoutMs,
                    char* lineBuf, uint8_t cap) {
  char local[BT_LINE_MAX];
  char* b = lineBuf ? lineBuf : local;
  uint8_t c = cap ? cap : (uint8_t)sizeof(local);
  uint32_t t0 = millis();
  while (millis() - t0 < (uint32_t)timeoutMs) {
    if (readLine(b, c, (uint16_t)(timeoutMs - (millis() - t0)))) {
      if (strstr(b, token)) return true;
    }
  }
  return false;
}
