/* =========================================================================
 * TWS-HUB -- log.h
 * Лог в Serial. Форматные строки обязательно оборачивайте в PSTR().
 * ========================================================================= */
#pragma once
#include <stdarg.h>
#include <stdint.h>

void logBegin(unsigned long baud);
void logP(char level, const char* fmt_P, ...);   /* fmt_P -- из flash (PSTR) */

#define LOGE(...) logP('E', __VA_ARGS__)
#define LOGW(...) logP('W', __VA_ARGS__)
#define LOGI(...) logP('I', __VA_ARGS__)

#if TWSHUB_DEBUG
  #define LOGD(...) logP('D', __VA_ARGS__)
#else
  #define LOGD(...) do {} while (0)
#endif

/* Утилиты */
void macToStr(const uint8_t mac[6], char out13[13]);
bool strToMac(const char* s12, uint8_t out[6]);
void hexUpper(uint8_t b, char out[3]);
