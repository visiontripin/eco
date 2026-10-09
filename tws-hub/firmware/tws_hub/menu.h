/* =========================================================================
 * TWS-HUB -- menu.h : экраны и навигация
 * ========================================================================= */
#pragma once
#include "config.h"
#include "buttons.h"

void menuInit();
void menuTick();                    /* прорисовка + фоновая логика */
void menuHandle(uint8_t id, uint8_t ev);
void menuRefreshNow();              /* принудительная перерисовка */
