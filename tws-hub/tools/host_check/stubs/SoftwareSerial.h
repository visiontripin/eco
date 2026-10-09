#pragma once
#include <Arduino.h>
class SoftwareSerial : public Stream {
 public:
  SoftwareSerial(uint8_t rx, uint8_t tx) : _rx(rx), _tx(tx) {}
  void begin(unsigned long) {}
  bool listen() { return true; }
 private:
  uint8_t _rx, _tx;
};
