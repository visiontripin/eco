#include "ui.h"
#include <string.h>

#if TWSHUB_DISPLAY == DISP_U8X8
  #include <U8x8lib.h>
  #include <Wire.h>
  static U8X8_SSD1306_128X64_NONAME_HW_I2C g_u8x8(U8X8_PIN_NONE);
#endif

static bool g_ready = false;

void uiInit() {
#if TWSHUB_DISPLAY == DISP_U8X8
  Wire.begin();
  g_u8x8.begin();
  g_u8x8.setPowerSave(0);
  g_u8x8.setFont(u8x8_font_chroma48medium8_r);
  g_u8x8.setContrast(120);
  g_u8x8.clearDisplay();
  g_ready = true;
#else
  g_ready = false;
#endif
}

void uiSetPowerSave(bool off) {
#if TWSHUB_DISPLAY == DISP_U8X8
  if (g_ready) g_u8x8.setPowerSave(off ? 1 : 0);
#endif
}

void uiSetContrast(uint8_t v) {
#if TWSHUB_DISPLAY == DISP_U8X8
  if (g_ready) g_u8x8.setContrast(v);
#endif
}

void uiClear() {
#if TWSHUB_DISPLAY == DISP_U8X8
  if (g_ready) g_u8x8.clearDisplay();
#endif
}

void padRight(char* dst, const char* src, uint8_t width) {
  uint8_t i = 0;
  while (src && src[i] && i < width - 1) { dst[i] = src[i]; i++; }
  while (i < width - 1) dst[i++] = ' ';
  dst[width - 1] = '\0';
}

static void drawRaw(uint8_t row, const char* text, bool inverse) {
#if TWSHUB_DISPLAY == DISP_U8X8
  if (!g_ready || row >= DISP_ROWS) return;
  char buf[DISP_COLS + 1];
  padRight(buf, text, DISP_COLS + 1);
  if (inverse) g_u8x8.setInverseFont(1);
  g_u8x8.drawString(0, row, buf);
  if (inverse) g_u8x8.setInverseFont(0);
#else
  (void)row; (void)text; (void)inverse;
#endif
}

void uiRow(uint8_t row, const char* text) { drawRaw(row, text, false); }

void uiRowP(uint8_t row, const char* text_P) {
  char buf[DISP_COLS + 1];
  strncpy_P(buf, text_P, DISP_COLS);
  buf[DISP_COLS] = '\0';
  drawRaw(row, buf, false);
}

void uiRowSel(uint8_t row, const char* text, bool selected) {
  drawRaw(row, text, selected);
}

void uiRowSelP(uint8_t row, const char* text_P, bool selected) {
  char buf[DISP_COLS + 1];
  strncpy_P(buf, text_P, DISP_COLS);
  buf[DISP_COLS] = '\0';
  drawRaw(row, buf, selected);
}

void uiTitle(const char* text) {
#if TWSHUB_DISPLAY == DISP_U8X8
  if (!g_ready) return;
  char buf[DISP_COLS + 1];
  padRight(buf, text, DISP_COLS + 1);
  g_u8x8.setInverseFont(1);
  g_u8x8.drawString(0, 0, buf);
  g_u8x8.setInverseFont(0);
#else
  (void)text;
#endif
}

void uiTitleP(const char* text_P) {
  char buf[DISP_COLS + 1];
  strncpy_P(buf, text_P, DISP_COLS);
  buf[DISP_COLS] = '\0';
  uiTitle(buf);
}

void uiProgress(uint8_t row, uint8_t percent) {
  char buf[DISP_COLS + 1];
  uint8_t filled = (uint8_t)((uint16_t)percent * (DISP_COLS - 2) / 100);
  uint8_t i = 0;
  buf[i++] = '[';
  for (uint8_t k = 0; k < DISP_COLS - 2; k++) buf[i++] = (k < filled) ? '#' : '.';
  buf[i++] = ']';
  buf[i] = '\0';
  drawRaw(row, buf, false);
}
