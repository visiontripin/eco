#pragma once
#include <stdint.h>
class TwoWire {
 public:
  void begin() {}
  void begin(uint8_t) {}
  void setClock(uint32_t) {}
};
inline TwoWire& hostWire() { static TwoWire w; return w; }
#define Wire hostWire()
