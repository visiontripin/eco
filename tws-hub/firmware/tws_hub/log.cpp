#include "log.h"
#include "config.h"
#include <avr/pgmspace.h>
#include <stdio.h>

void logBegin(unsigned long baud) {
  Serial.begin(baud);
#if TWSHUB_DEBUG
  while (!Serial && millis() < 2000) { /* ждём USB на native-платах */ }
#endif
}

void logP(char level, const char* fmt_P, ...) {
  char buf[110];
  va_list ap;
  va_start(ap, fmt_P);
  vsnprintf_P(buf, sizeof(buf), fmt_P, ap);
  va_end(ap);

  Serial.print('[');
  Serial.print(millis());
  Serial.print("] ");
  Serial.print(level);
  Serial.print(": ");
  Serial.println(buf);
}

void hexUpper(uint8_t b, char out[3]) {
  static const char H[] = "0123456789ABCDEF";
  out[0] = H[(b >> 4) & 0x0F];
  out[1] = H[b & 0x0F];
  out[2] = '\0';
}

void macToStr(const uint8_t mac[6], char out13[13]) {
  for (uint8_t i = 0; i < 6; i++) hexUpper(mac[i], out13 + i * 2);
  out13[12] = '\0';
}

static int hexVal(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

bool strToMac(const char* s, uint8_t out[6]) {
  if (!s) return false;
  for (uint8_t i = 0; i < 6; i++) {
    int hi = hexVal(s[i * 2]);
    int lo = hexVal(s[i * 2 + 1]);
    if (hi < 0 || lo < 0) return false;
    out[i] = (uint8_t)((hi << 4) | lo);
  }
  return true;
}
