/* Минимальная заглушка Arduino.h -- только для проверки синтаксиса/типов
   прошивки на хосте (g++ -fsyntax-only). Не для исполнения! */
#pragma once
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <avr/pgmspace.h>

#define HIGH 1
#define LOW  0
#define OUTPUT 1
#define INPUT 0
#define INPUT_PULLUP 2
#define LED_BUILTIN 13

typedef uint8_t byte;

static unsigned long g_hostMillis = 123456UL;
static int g_hostDigitalRead = 1;

inline unsigned long millis() { return g_hostMillis; }
inline unsigned long micros() { return g_hostMillis * 1000UL; }
inline void delay(unsigned long) {}
inline void delayMicroseconds(unsigned int) {}
inline void pinMode(uint8_t, uint8_t) {}
inline void digitalWrite(uint8_t, uint8_t) {}
inline int  digitalRead(uint8_t) { return g_hostDigitalRead; }
inline void tone(uint8_t, unsigned int, unsigned long = 0) {}
inline void noTone(uint8_t) {}

class __FlashStringHelper;
#define F(str) (reinterpret_cast<const __FlashStringHelper*>(PSTR(str)))
#define FPSTR(pstr) (reinterpret_cast<const __FlashStringHelper*>(pstr))

class Print {
 public:
  void begin(unsigned long) {}
  void begin(unsigned long, int) {}
  size_t write(const char*) { return 0; }
  void print(const char*) {}
  void print(char) {}
  void print(unsigned char) {}
  void print(int) {}
  void print(unsigned int) {}
  void print(long) {}
  void print(unsigned long) {}
  void print(double) {}
  void print(const __FlashStringHelper*) {}
  void println() {}
  void println(const char*) {}
  void println(char) {}
  void println(unsigned char) {}
  void println(int) {}
  void println(unsigned int) {}
  void println(long) {}
  void println(unsigned long) {}
  void println(double) {}
  void println(const __FlashStringHelper*) {}
  void flush() {}
};

class Stream : public Print {
 public:
  int  available() { return 0; }
  int  read() { return -1; }
  int  peek() { return -1; }
  void setTimeout(unsigned long) {}
  operator bool() const { return true; }
};

class HardwareSerial : public Stream {};
inline HardwareSerial& hostSerial0() { static HardwareSerial s; return s; }
inline HardwareSerial& hostSerial1() { static HardwareSerial s; return s; }
#define Serial  hostSerial0()
#define Serial1 hostSerial1()
