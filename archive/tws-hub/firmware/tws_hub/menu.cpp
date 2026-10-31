#include "menu.h"
#include "ui.h"
#include "speaker_db.h"
#include "audio_core.h"
#include "bt_slot.h"
#include "log.h"
#include <avr/pgmspace.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

/* ------------------------------ экраны ----------------------------------- */
enum Scr : uint8_t {
  SCR_HOME = 0, SCR_MAIN, SCR_SPEAKERS, SCR_SPEAKER,
  SCR_SCAN, SCR_TOPO, SCR_SETTINGS, SCR_INFO
};

static Scr     g_scr        = SCR_HOME;
static uint8_t g_idx        = 0;     /* курсор в текущем списке */
static uint8_t g_top        = 0;     /* прокрутка */
static uint8_t g_curSpk     = 0;     /* какая колонка правится */
static bool    g_dirty      = true;
static uint32_t g_lastDraw  = 0;

/* --------------------------- настройки (RAM) ----------------------------- */
static uint8_t  g_contrast = 120;
static bool     g_autoDim  = true;
static bool     g_beep     = false;
static bool     g_dimmed   = false;
static uint32_t g_lastInput = 0;

/* ---------------------------- состояние поиска --------------------------- */
static bool   g_scanning = false;
static bool   g_scanHas  = false;
static char   g_scanName[SPEAKER_NAME_LEN];
static uint8_t g_scanMac[6];
static int8_t g_scanRssi = 0;

static bool scanHasResult() { return g_scanHas; }

static void scanNext(uint16_t ms) {
  g_scanHas = slotScanNext(1, g_scanName, (uint8_t)sizeof(g_scanName), g_scanMac, ms);
  if (g_scanHas) LOGI(PSTR("scan: %s"), g_scanName);
}

static void scanStart() {
  g_scanning = true;
  g_scanHas  = false;
  if (!slotScanStart(1)) { g_scanning = false; return; }
  scanNext(5000);
}

/* --------------------------- строки во flash ----------------------------- */
static const char MM_0[] PROGMEM = "Connect all";
static const char MM_1[] PROGMEM = "Disconnect all";
static const char MM_2[] PROGMEM = "Speakers";
static const char MM_3[] PROGMEM = "Scan and add";
static const char MM_4[] PROGMEM = "Topology";
static const char MM_5[] PROGMEM = "Settings";
static const char MM_6[] PROGMEM = "About";
static const char* const MM[] PROGMEM = {MM_0, MM_1, MM_2, MM_3, MM_4, MM_5, MM_6};
#define MM_N 7

static const char SP_0[] PROGMEM = "Enabled";
static const char SP_1[] PROGMEM = "Channel";
static const char SP_2[] PROGMEM = "Trim";
static const char SP_3[] PROGMEM = "Preferred slot";
static const char SP_4[] PROGMEM = "Forget";
static const char SP_5[] PROGMEM = "Back";
static const char* const SP[] PROGMEM = {SP_0, SP_1, SP_2, SP_3, SP_4, SP_5};
#define SP_N 6

static const char TP_0[] PROGMEM = "Dual-link 2 spk";
static const char TP_1[] PROGMEM = "Multi N spk";
static const char TP_2[] PROGMEM = "Party chain";
static const char TP_3[] PROGMEM = "Auracast";
static const char TP_4[] PROGMEM = "Back";
static const char* const TP[] PROGMEM = {TP_0, TP_1, TP_2, TP_3, TP_4};
#define TP_N 5

static const char ST_0[] PROGMEM = "Contrast";
static const char ST_1[] PROGMEM = "Auto-dim";
static const char ST_2[] PROGMEM = "Key beep";
static const char ST_3[] PROGMEM = "Factory reset";
static const char ST_4[] PROGMEM = "Back";
static const char* const ST[] PROGMEM = {ST_0, ST_1, ST_2, ST_3, ST_4};
#define ST_N 5

static const char T_HOME[] PROGMEM = "TWS-HUB v0.4";
static const char T_MAIN[] PROGMEM = "MENU";
static const char T_SPK[]  PROGMEM = "SPEAKERS";
static const char T_SCAN[] PROGMEM = "SCAN";
static const char T_TOPO[] PROGMEM = "TOPOLOGY";
static const char T_SET[]  PROGMEM = "SETTINGS";
static const char T_INFO[] PROGMEM = "ABOUT";

static const char HINT_OK[]   PROGMEM = "OK=menu  FN=link";
static const char HINT_LIST[] PROGMEM = "UP/DN  OK=sel  BK";
static const char HINT_SCAN[] PROGMEM = "FN=scan OK=add";
static const char HINT_EDIT[] PROGMEM = "OK=chg  BK=back";

static const char TOPO_NAME_0[] PROGMEM = "dual";
static const char TOPO_NAME_1[] PROGMEM = "multi";
static const char TOPO_NAME_2[] PROGMEM = "party";
static const char TOPO_NAME_3[] PROGMEM = "auracast";
static const char* const TOPO_NAMES[] PROGMEM =
  {TOPO_NAME_0, TOPO_NAME_1, TOPO_NAME_2, TOPO_NAME_3};

static const char ROLE_M[] PROGMEM = "mono";
static const char ROLE_L[] PROGMEM = "L";
static const char ROLE_R[] PROGMEM = "R";
static const char* const ROLE_NAMES[] PROGMEM = {ROLE_M, ROLE_L, ROLE_R};

/* ----------------------------- помощники --------------------------------- */
static const char* tblItem(const char* const* tbl, uint8_t i) {
  return (const char*)pgm_read_ptr(&tbl[i]);
}

/*
 * Классический AVR-приём: разница между вершиной стека и текущим
 * __brkval (началом кучи). Считаем в байтах через указатели на char,
 * чтобы не зависеть от разрядности int: на 8-битной AVR ptrdiff_t
 * 16-битный, на хосте при проверке -- 64-битный, и явное приведение
 * к int корректно в обоих случаях.
 */
static int freeRam() {
#if defined(__AVR__)
  extern int __heap_start, *__brkval;
  int v;
  const char* top = (const char*)&v;
  const char* brk = (__brkval == 0) ? (const char*)&__heap_start
                                    : (const char*)__brkval;
  ptrdiff_t d = top - brk;
  return (int)d;
#else
  return -1;
#endif
}

/* ============================== отрисовка ================================ */
static void drawHome() {
  char b[17];
  uiTitleP(T_HOME);

  uint8_t rx = audioCoreRxState();
  snprintf(b, sizeof(b), "SRC  %-9s", (rx == A2DP_STREAMING) ? "playing"
                                    : (rx == A2DP_CONNECTED) ? "linked"
                                    : "wait");
  uiRow(1, b);

  snprintf(b, sizeof(b), "SPK  %d/%d  play %d",
           (int)audioCoreLinked(), (int)dbEnabledCount(), (int)audioCoreStreaming());
  uiRow(2, b);

  /* ВАЖНО: на AVR snprintf читает %s из RAM, поэтому строку из flash
     сначала копируем в маленький буфер. */
  char tb[10];
  strncpy_P(tb, tblItem(TOPO_NAMES, (uint8_t)audioCoreTopology()), sizeof(tb) - 1);
  tb[sizeof(tb) - 1] = '\0';
  snprintf(b, sizeof(b), "TOPO %-9s", tb);
  uiRow(3, b);

  uint8_t codec = 0;
  for (uint8_t s = 1; s < MAX_SLOTS; s++)
    if (slotRef(s).a2dpState == A2DP_STREAMING) { codec = slotRef(s).codec; break; }
  snprintf(b, sizeof(b), "CODEC %-8s", codecName(codec));
  uiRow(4, b);

  if (audioCoreBusy()) {
    snprintf(b, sizeof(b), "%-11s %3d%%", audioCorePhaseText(), (int)audioCoreProgress());
    uiRow(5, b);
    uiProgress(6, audioCoreProgress());
  } else {
    snprintf(b, sizeof(b), "RAM %6d b", freeRam());
    uiRow(5, b);
    snprintf(b, sizeof(b), "UP %7lu s", (unsigned long)(millis() / 1000UL));
    uiRow(6, b);
  }
  uiRowP(7, HINT_OK);
}

static void drawList(const char* const* tbl, uint8_t n) {
  for (uint8_t r = 0; r < DISP_ROWS - 2; r++) {
    uint8_t i = (uint8_t)(g_top + r);
    if (i >= n) { uiRow((uint8_t)(r + 1), ""); continue; }
    uiRowSelP((uint8_t)(r + 1), tblItem(tbl, i), (i == g_idx));
  }
}

static void drawSpeakers() {
  char b[17];
  uint8_t n = (uint8_t)(dbCount() + 1);
  for (uint8_t r = 0; r < DISP_ROWS - 2; r++) {
    uint8_t i = (uint8_t)(g_top + r);
    if (i >= n) { uiRow((uint8_t)(r + 1), ""); continue; }
    if (i == dbCount()) {
      uiRowSel((uint8_t)(r + 1), "< scan/add >", (i == g_idx));
      continue;
    }
    SpeakerRec* rec = dbGet(i);
    snprintf(b, sizeof(b), "%c %-11.11s %-3s",
             (rec->flags & SPK_FLAG_ENABLED) ? '*' : ' ',
             rec->name,
             tblItem(ROLE_NAMES, rec->role));
    uiRowSel((uint8_t)(r + 1), b, (i == g_idx));
  }
}

static void drawSpeakerEdit() {
  char b[17];
  SpeakerRec* rec = dbGet(g_curSpk);
  if (!rec) { g_scr = SCR_SPEAKERS; return; }

  uiTitle(rec->name);
  for (uint8_t i = 0; i < SP_N; i++) {
    b[0] = '\0';
    switch (i) {
      case 0: snprintf(b, sizeof(b), "Enabled   %s",
                       (rec->flags & SPK_FLAG_ENABLED) ? "yes" : "no"); break;
      case 1: snprintf(b, sizeof(b), "Channel   %s",
                       tblItem(ROLE_NAMES, rec->role)); break;
      case 2: snprintf(b, sizeof(b), "Trim      %+d dB", (int)rec->trimDb); break;
      case 3: snprintf(b, sizeof(b), "Slot      %s",
                       rec->slotHint == 0 ? "auto" : "fixed"); break;
      case 4: snprintf(b, sizeof(b), "Forget this"); break;
      default: snprintf(b, sizeof(b), "Back"); break;
    }
    uiRowSel((uint8_t)(i + 1), b, (i == g_idx));
  }
  uiRowP(7, HINT_EDIT);
}

static void drawScan() {
  char b[17];
  uiTitleP(T_SCAN);
  if (g_scanning) uiRow(1, "Scanning...");
  else if (scanHasResult()) {
    snprintf(b, sizeof(b), "%-15.15s", g_scanName);
    uiRow(1, b);
    snprintf(b, sizeof(b), "%02X:%02X:%02X:%02X:%02X:%02X",
             g_scanMac[0], g_scanMac[1], g_scanMac[2],
             g_scanMac[3], g_scanMac[4], g_scanMac[5]);
    uiRow(2, b);
  } else {
    uiRow(1, "No devices");
    for (uint8_t r = 2; r < 7; r++) uiRow(r, "");
  }
  uiRowP(7, HINT_SCAN);
}

static void drawTopo() {
  char b[17];
  char buf[17];
  for (uint8_t i = 0; i < TP_N; i++) {
    strncpy_P(buf, tblItem(TP, i), 16);
    buf[16] = '\0';
    snprintf(b, sizeof(b), "%s%s", (i < 4 && (uint8_t)audioCoreTopology() == i) ? ">" : " ", buf);
    uiRowSel((uint8_t)(i + 1), b, (i == g_idx));
  }
  uiRow(6, "sync: see docs/05");
  uiRow(7, "");
}

static void drawSettings() {
  char b[17];
  for (uint8_t i = 0; i < ST_N; i++) {
    b[0] = '\0';
    switch (i) {
      case 0: snprintf(b, sizeof(b), "Contrast  %d", (int)g_contrast); break;
      case 1: snprintf(b, sizeof(b), "Auto-dim  %s", g_autoDim ? "on" : "off"); break;
      case 2: snprintf(b, sizeof(b), "Key beep  %s", g_beep ? "on" : "off"); break;
      case 3: snprintf(b, sizeof(b), "Factory reset"); break;
      default: snprintf(b, sizeof(b), "Back"); break;
    }
    uiRowSel((uint8_t)(i + 1), b, (i == g_idx));
  }
  uiRow(6, "");
  uiRowP(7, HINT_LIST);
}

static void drawInfo() {
  char b[17];
  uiTitleP(T_INFO);
  snprintf(b, sizeof(b), "fw  %s", TWS_HUB_VERSION);
  uiRow(1, b);
#if TWSHUB_BOARD == BOARD_NANO_EVERY
  uiRow(2, "board Nano Every");
#elif TWSHUB_BOARD == BOARD_MEGA2560
  uiRow(2, "board Mega 2560");
#else
  uiRow(2, "board Nano/Uno");
#endif
  snprintf(b, sizeof(b), "slots %d bd %lu", (int)slotsCount(),
           (unsigned long)BT_TARGET_BAUD);
  uiRow(3, b);
  snprintf(b, sizeof(b), "spk %d/%d in db", (int)dbCount(), (int)MAX_SPEAKERS);
  uiRow(4, b);
  uiRow(5, "Audio bypasses");
  uiRow(6, "the MCU");
  uiRow(7, "");
}

static void draw() {
  uiClear();
  switch (g_scr) {
    case SCR_HOME:     drawHome();     break;
    case SCR_MAIN:     uiTitleP(T_MAIN); drawList(MM, MM_N); uiRowP(7, HINT_LIST); break;
    case SCR_SPEAKERS: uiTitleP(T_SPK);  drawSpeakers();     uiRowP(7, HINT_LIST); break;
    case SCR_SPEAKER:  drawSpeakerEdit(); break;
    case SCR_SCAN:     uiTitleP(T_SCAN); drawScan();         break;
    case SCR_TOPO:     uiTitleP(T_TOPO); drawTopo();         break;
    case SCR_SETTINGS: uiTitleP(T_SET);  drawSettings();     break;
    case SCR_INFO:     drawInfo();       break;
  }
  g_dirty = false;
}

/* ============================== навигация ================================ */
static void go(Scr s, uint8_t idx = 0) {
  g_scr = s; g_idx = idx; g_top = 0;
  g_dirty = true;
}

static void moveSel(int8_t delta, uint8_t n) {
  if (n == 0) return;
  int16_t v = (int16_t)g_idx + delta;
  if (v < 0) v = 0;
  if (v > (int16_t)(n - 1)) v = (int16_t)(n - 1);
  g_idx = (uint8_t)v;
  if (g_idx < g_top) g_top = g_idx;
  if (g_idx >= g_top + (DISP_ROWS - 2)) g_top = (uint8_t)(g_idx - (DISP_ROWS - 3));
  g_dirty = true;
}

static void beep() {
  if (!g_beep) return;
  pinMode(PIN_BUZZER, OUTPUT);
  tone(PIN_BUZZER, 2200, 30);
}

/* ------------------------- действия главного меню ------------------------ */
static void execMain(uint8_t i) {
  switch (i) {
    case 0: audioCoreLinkAll();   go(SCR_HOME); break;
    case 1: audioCoreUnlinkAll(); go(SCR_HOME); break;
    case 2: go(SCR_SPEAKERS);   break;
    case 3: go(SCR_SCAN);       break;
    case 4: go(SCR_TOPO);       break;
    case 5: go(SCR_SETTINGS);   break;
    default: go(SCR_INFO);      break;
  }
}

static void execSpeakerField(uint8_t field) {
  SpeakerRec* rec = dbGet(g_curSpk);
  if (!rec) { go(SCR_SPEAKERS); return; }
  switch (field) {
    case 0:
      dbSetFlag(g_curSpk, SPK_FLAG_ENABLED, !(rec->flags & SPK_FLAG_ENABLED));
      dbCommit();
      break;
    case 1:
      rec->role = (uint8_t)((rec->role + 1) % 3);
      dbCommit();
      break;
    case 2: {
      int t = rec->trimDb + 1;
      if (t > 12) t = -12;
      rec->trimDb = (int8_t)t;
      dbCommit();
      break;
    }
    case 3:
      rec->slotHint = (uint8_t)((rec->slotHint + 1) % MAX_SLOTS);
      dbCommit();
      break;
    case 4:
      dbRemove(g_curSpk);
      go(SCR_SPEAKERS, 0);
      return;
    default:
      go(SCR_SPEAKERS, g_curSpk);
      return;
  }
  g_dirty = true;
}

static void execTopo(uint8_t i) {
  if (i >= 4) { go(SCR_MAIN, 4); return; }
  audioCoreSetTopology((Topology)i);
  g_dirty = true;
}

static void execSettings(uint8_t i) {
  switch (i) {
    case 0:
      g_contrast = (uint8_t)(g_contrast + 32);
      if (g_contrast < 32) g_contrast = 32;
      uiSetContrast(g_contrast);
      break;
    case 1: g_autoDim = !g_autoDim; break;
    case 2: g_beep = !g_beep; break;
    case 3:
      dbFactoryReset();
      audioCoreInit();
      go(SCR_HOME);
      return;
    default: go(SCR_MAIN, 5); return;
  }
  g_dirty = true;
}

/* --------------------------- обработка кнопок ---------------------------- */
void menuHandle(uint8_t id, uint8_t ev) {
  g_lastInput = millis();
  if (ev == EV_NONE) return;

  if (ev == EV_LONG && id == BTN_BACK) { go(SCR_HOME); return; }

  /* ---------- HOME ---------- */
  if (g_scr == SCR_HOME) {
    if (ev != EV_CLICK && ev != EV_LONG) return;
    if (id == BTN_OK) { go(SCR_MAIN); beep(); }
    else if (id == BTN_FN || id == BTN_UP || id == BTN_DOWN) {
      audioCoreLinkAll(); beep();
    }
    return;
  }

  /* ---------- SCAN ---------- */
  if (g_scr == SCR_SCAN) {
    if (ev != EV_CLICK && ev != EV_LONG) return;
    if (id == BTN_BACK) { g_scanning = false; go(SCR_MAIN); return; }
    if (id == BTN_FN)   { scanStart(); g_dirty = true; return; }
    if (id == BTN_DOWN) { scanNext(2500); g_dirty = true; return; }
    if (id == BTN_OK && scanHasResult()) {
      int8_t r = dbAdd(g_scanMac, g_scanName);
      LOGI(PSTR("dbAdd -> %d"), (int)r);
      go(SCR_SPEAKERS, (r > 0) ? (uint8_t)r : (uint8_t)0);
    }
    return;
  }

  /* ---------- списки ---------- */
  uint8_t n;
  switch (g_scr) {
    case SCR_MAIN:     n = MM_N; break;
    case SCR_SPEAKERS: n = (uint8_t)(dbCount() + 1); break;
    case SCR_SPEAKER:  n = SP_N; break;
    case SCR_TOPO:     n = TP_N; break;
    case SCR_SETTINGS: n = ST_N; break;
    default:           n = 0;    break;
  }

  if (id == BTN_UP)   { moveSel(-1, n); return; }
  if (id == BTN_DOWN) { moveSel(+1, n); return; }

  if (id == BTN_BACK && (ev == EV_CLICK || ev == EV_LONG)) {
    switch (g_scr) {
      case SCR_MAIN:     go(SCR_HOME); break;
      case SCR_SPEAKERS: go(SCR_MAIN, 2); break;
      case SCR_SPEAKER:  go(SCR_SPEAKERS, g_curSpk); break;
      case SCR_TOPO:     go(SCR_MAIN, 4); break;
      case SCR_SETTINGS: go(SCR_MAIN, 5); break;
      case SCR_INFO:     go(SCR_MAIN, 6); break;
      default:           go(SCR_HOME); break;
    }
    return;
  }

  if (id == BTN_OK && (ev == EV_CLICK || ev == EV_LONG)) {
    beep();
    switch (g_scr) {
      case SCR_MAIN:
        execMain(g_idx);
        break;
      case SCR_SPEAKERS:
        if (g_idx >= dbCount()) go(SCR_SCAN);
        else { g_curSpk = g_idx; go(SCR_SPEAKER, 0); }
        break;
      case SCR_SPEAKER:
        execSpeakerField(g_idx);
        break;
      case SCR_TOPO:
        execTopo(g_idx);
        break;
      case SCR_SETTINGS:
        execSettings(g_idx);
        break;
      case SCR_INFO:
        go(SCR_MAIN, 6);
        break;
      default:
        break;
    }
  }
}

/* ============================== жизненный цикл =========================== */
void menuInit() {
  g_scr   = SCR_HOME;
  g_dirty = true;
  uiSetContrast(g_contrast);
  draw();
}

void menuRefreshNow() { g_dirty = true; }

void menuTick() {
  uint32_t now = millis();
  bool periodic = (g_scr == SCR_HOME) && (now - g_lastDraw > 500);
  if (g_dirty || periodic) {
    g_lastDraw = now;
    draw();
  }
  bool wantDim = g_autoDim && ((now - g_lastInput) > UI_IDLE_MS);
  if (wantDim != g_dimmed) {
    g_dimmed = wantDim;
    uiSetPowerSave(wantDim);
    if (!wantDim) g_dirty = true;
  }
}
