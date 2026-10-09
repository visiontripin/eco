/* =========================================================================
 * TWS-HUB -- ui.h
 * Тонкая обёртка над дисплеем. По умолчанию U8g2 в режиме U8x8:
 * текстовый вывод 16x8 символов, БЕЗ framebuffer -- это экономит
 * ~1 КБ SRAM, что критично для ATmega328P (Nano/Uno).
 *
 * ВАЖНО: стандартные шрифты U8g2 не содержат кириллицу. Меню по умолчанию
 * латиницей. Как добавить русский -- см. docs/07-ui.md.
 * ========================================================================= */
#pragma once
#include "config.h"

void uiInit();
void uiSetPowerSave(bool off);
void uiSetContrast(uint8_t v);
void uiClear();

/* Печать строки в строку дисплея (row 0..7). Текст из RAM. */
void uiRow(uint8_t row, const char* text);
/* То же, но текст из flash (PSTR). */
void uiRowP(uint8_t row, const char* text_P);
/* Строка списка с инверсией (курсор). */
void uiRowSel(uint8_t row, const char* text, bool selected);
void uiRowSelP(uint8_t row, const char* text_P, bool selected);
/* Заголовок: инверсная шапка. */
void uiTitle(const char* text);
void uiTitleP(const char* text_P);

/* Прогресс-бар в указанной строке, 0..100 */
void uiProgress(uint8_t row, uint8_t percent);

void padRight(char* dst, const char* src, uint8_t width);
