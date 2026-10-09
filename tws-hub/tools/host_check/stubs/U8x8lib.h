/* Заглушка U8g2/U8x8 -- только для проверки синтаксиса на хосте. */
#pragma once
#include <stdint.h>

#define U8X8_PIN_NONE 255

static const uint8_t u8x8_font_chroma48medium8_r[2] = {0, 0};

class U8X8 {
 public:
  void begin() {}
  void setPowerSave(uint8_t) {}
  void setFont(const uint8_t*) {}
  void setContrast(uint8_t) {}
  void clearDisplay() {}
  void drawString(uint8_t, uint8_t, const char*) {}
  void setInverseFont(uint8_t) {}
  void setFlipMode(uint8_t) {}
};

class U8X8_SSD1306_128X64_NONAME_HW_I2C : public U8X8 {
 public:
  explicit U8X8_SSD1306_128X64_NONAME_HW_I2C(uint8_t reset = U8X8_PIN_NONE)
    : _reset(reset) {}
 private:
  uint8_t _reset;
};
