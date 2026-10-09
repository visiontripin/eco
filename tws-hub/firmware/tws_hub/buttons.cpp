#include "buttons.h"

#define QUEUE_CAP 8

struct BtnState {
  uint8_t  pin;
  uint8_t  id;
  bool     stable;      /* текущее стабильное состояние (true = нажата) */
  bool     lastRaw;
  uint32_t lastChange;
  uint32_t pressStart;
  bool     longFired;
  uint32_t nextRepeat;
};

static BtnState g_btn[5];

static struct {
  uint8_t items[QUEUE_CAP][2];
  uint8_t head, tail, n;
} g_q;

static void qpush(uint8_t id, uint8_t ev) {
  if (g_q.n >= QUEUE_CAP) return;   /* переполнение -- выбрасываем */
  g_q.items[g_q.tail][0] = id;
  g_q.items[g_q.tail][1] = ev;
  g_q.tail = (uint8_t)((g_q.tail + 1) % QUEUE_CAP);
  g_q.n++;
}

void buttonsInit() {
  g_q.head = g_q.tail = g_q.n = 0;

  const uint8_t pins[5] = {PIN_BTN_UP, PIN_BTN_DOWN, PIN_BTN_OK, PIN_BTN_BACK, PIN_BTN_FN};
  const uint8_t ids[5]  = {BTN_UP, BTN_DOWN, BTN_OK, BTN_BACK, BTN_FN};

  for (uint8_t i = 0; i < 5; i++) {
    g_btn[i].pin        = pins[i];
    g_btn[i].id         = ids[i];
    g_btn[i].stable     = false;
    g_btn[i].lastRaw    = !BTN_ACTIVE;
    g_btn[i].lastChange = 0;
    g_btn[i].pressStart = 0;
    g_btn[i].longFired  = false;
    g_btn[i].nextRepeat = 0;
    pinMode(pins[i], INPUT_PULLUP);
  }
}

void buttonsClear() { g_q.head = g_q.tail = g_q.n = 0; }

void buttonsTick() {
  uint32_t now = millis();

  for (uint8_t i = 0; i < 5; i++) {
    BtnState& b = g_btn[i];
    bool raw = (digitalRead(b.pin) == BTN_ACTIVE);

    if (raw != b.lastRaw) {
      b.lastRaw = raw;
      b.lastChange = now;
    }

    if ((now - b.lastChange) >= DEBOUNCE_MS && raw != b.stable) {
      b.stable = raw;
      if (raw) {
        b.pressStart = now;
        b.longFired  = false;
        b.nextRepeat = now + REPEAT_DELAY_MS;
      } else {
        if (!b.longFired) qpush(b.id, EV_CLICK);
      }
    }

    if (b.stable) {
      if (!b.longFired && (now - b.pressStart) >= LONG_PRESS_MS) {
        b.longFired = true;
        qpush(b.id, EV_LONG);
      }
      /* автоповтор только для UP/DOWN */
      if ((b.id == BTN_UP || b.id == BTN_DOWN) && now >= b.nextRepeat) {
        b.nextRepeat = now + REPEAT_RATE_MS;
        qpush(b.id, EV_REPEAT);
      }
    }
  }
}

bool buttonsPoll(uint8_t* id, uint8_t* ev) {
  if (g_q.n == 0) return false;
  *id = g_q.items[g_q.head][0];
  *ev = g_q.items[g_q.head][1];
  g_q.head = (uint8_t)((g_q.head + 1) % QUEUE_CAP);
  g_q.n--;
  return true;
}
