/* =========================================================================
 * TWS-HUB -- buttons.h
 * 5 тактовых кнопок (активный LOW, внутренняя подтяжка).
 * Отдаёт события: клик, длинное нажатие, автоповтор.
 * ========================================================================= */
#pragma once
#include "config.h"

enum BtnId : uint8_t {
  BTN_NONE = 0, BTN_UP, BTN_DOWN, BTN_OK, BTN_BACK, BTN_FN
};

enum BtnEv : uint8_t {
  EV_NONE = 0, EV_CLICK, EV_LONG, EV_REPEAT
};

void buttonsInit();
void buttonsTick();                  /* вызывать из loop() */
bool buttonsPoll(uint8_t* id, uint8_t* ev);   /* забрать событие из очереди */
void buttonsClear();
