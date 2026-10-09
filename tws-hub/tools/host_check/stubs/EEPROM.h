#pragma once
#include <stdint.h>
class EepromStub {
 public:
  uint8_t read(int addr) { return (uint8_t)(addr * 7); }
  void write(int, uint8_t) {}
  void update(int, uint8_t) {}
  uint8_t operator[](int addr) { return read(addr); }
};
inline EepromStub& hostEeprom() { static EepromStub e; return e; }
#define EEPROM hostEeprom()
