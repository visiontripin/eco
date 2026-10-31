/* =========================================================================
 * TWS-HUB -- audio_core.h
 * Оркестрация подключений. НЕ блокирует loop(): каждый tick делает один
 * шаг конечного автомата, поэтому меню и кнопки остаются отзывчивыми.
 *
 * Топологии:
 *   TOPO_DUAL      -- 1 приёмник + 1 передатчик с dual-link (2 колонки,
 *                     одна микросхема держит оба линка -> СИНХРОННО).
 *   TOPO_MULTI     -- 1 приёмник + N независимых передатчиков (N колонок,
 *                     общая тактовая I2S, но у каждого линка свой джиттер-
 *                     буфер -> рассинхрон. См. docs/05).
 *   TOPO_PARTY     -- 1 приёмник + 1 передатчик -> мастер-колонка, дальше
 *                     цепочкой PartyBoost/PartyCast/Party Chain (синхронно
 *                     внутри экосистемы вендора).
 *   TOPO_AURACAST  -- 1 приёмник + LE Audio BIS-передатчик (Auracast),
 *                     любое число приёмников, синхронно по стандарту.
 * ========================================================================= */
#pragma once
#include "config.h"

enum Topology : uint8_t {
  TOPO_DUAL     = 0,
  TOPO_MULTI    = 1,
  TOPO_PARTY    = 2,
  TOPO_AURACAST = 3
};

enum CorePhase : uint8_t {
  PH_IDLE = 0,
  PH_PROBE,        /* ждём "AT" -> OK */
  PH_ROLE,         /* выставляем профиль */
  PH_CONN_CMD,     /* AT+A2DPCONN=<mac> -> OK */
  PH_CONN_WAIT,    /* ждём +A2DPSTAT=3 */
  PH_AUDIO_CMD,    /* AT+A2DPAUDIO=1 -> OK */
  PH_AUDIO_WAIT,   /* ждём +A2DPSTAT=3 (link up) */
  PH_STREAM_WAIT,  /* ждём +A2DPSTAT=5 (реально играет) */
  PH_NEXT,         /* следующий слот */
  PH_DONE
};

void     audioCoreInit();
void     audioCoreTick();        /* вызывать из loop() */
void     audioCoreLinkAll();     /* запустить подключение всех включённых */
void     audioCoreUnlinkAll();
bool     audioCoreBusy();
uint8_t  audioCoreProgress();    /* 0..100 */
const char* audioCorePhaseText();/* коротко, для дисплея */

Topology audioCoreTopology();
void     audioCoreSetTopology(Topology t);

uint8_t  audioCoreLinked();      /* сколько колонок в A2DP connected+ */
uint8_t  audioCoreStreaming();   /* сколько реально играют */
uint8_t  audioCoreRxState();
