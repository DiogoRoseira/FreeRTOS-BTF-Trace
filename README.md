# FreeRTOS-BTF-Trace

A lightweight, open-source framework for recording and visualising FreeRTOS task scheduling traces.
Trace output is produced in two industry-standard formats:

- **BTF (Best Trace Format)** — a CSV-based format designed for system-level timing and performance analysis of embedded real-time systems. Specification available [here](https://assets.vector.com/cms/content/products/TA_Tool_Suite/Docs/BTF_Specification.pdf).
- **VCD (Value Change Dump)** — an ASCII-based waveform format compatible with logic simulation tools such as [GTKWave](http://gtkwave.sourceforge.net).

---

## Overview

Identifying performance bottlenecks in real-time embedded systems often requires a full-featured commercial tool such as [Percepio Tracealyzer](https://percepio.com/tracealyzer/). This project provides a simple, extensible, and completely free alternative. It instruments FreeRTOS with trace hooks, captures context-switch events into a compact in-memory buffer, and converts that buffer to BTF or VCD for offline analysis.

A related approach using [BareCTF](https://barectf.org/) and [Eclipse Trace Compass](https://www.eclipse.org/tracecompass/) is available at [freertos-barectf](https://github.com/gpollo/freertos-barectf).

### Trace pipeline

```
FreeRTOS trace hooks
  → btf_trace_add_*() (ring buffer in RAM)
  → traceEND() / simulator syscall
  → dump.bin
  → tools/gentrace
  → .btf / .vcd
  → BTFViewer (desktop or web) / Trace Compass / GTKWave
```

---

## Repository Structure

```
FreeRTOS-Trace/   Trace library (hooks, ring buffer, optional live BTF dump)
tools/            gentrace — binary dump → BTF or VCD
rvsim/            Bundled RV32IM instruction-set simulator (syscall 0x99 → dump.bin)
Demo/             Example FreeRTOS apps built for RISC-V, run under rvsim
BTFViewer/        Interactive BTF viewer (PyQt5 desktop + Vue 3 web app)
tracedata/        Sample outputs (example.btf, example.vcd)
images/           Documentation screenshots
```

---

## Getting Started

### Prerequisites

The included demo targets **RISC-V** and runs on the bundled **`rvsim`** simulator (also compatible with external ISS tools such as [srv32](https://github.com/kuopinghsu/srv32)).

Install a RISC-V embedded toolchain (`riscv64-unknown-elf-gcc`, etc.) as described in the srv32 [Building toolchains](https://github.com/kuopinghsu/srv32#building-toolchains) section.

### Build and Run

```bash
make run
```

This clones FreeRTOS Kernel V11.1.0 (first run), builds the demo, runs it under `rvsim/rvsim`, and writes `tracedata/trace.btf` and `tracedata/trace.vcd` via `tools/gentrace`.

---

## Visualising the Trace

### BTF Viewer (built-in)

An interactive Gantt-style viewer is included in the `BTFViewer/` directory (desktop PyQt5 app and browser-based web viewer).

**Desktop requirements:** Python 3.8+ and PyQt5 ≥ 5.15

```bash
pip install PyQt5
python BTFViewer/btf_viewer.py tracedata/example.btf
```

See [`BTFViewer/README.md`](BTFViewer/README.md) for the full feature reference (zoom, cursors, trace compare, session restore, export, etc.).

### Eclipse Trace Compass

Convert the binary dump to BTF format using `gentrace`, then open the resulting file in [Trace Compass](https://www.eclipse.org/tracecompass/):

```bash
tools/gentrace dump.bin trace.btf
```

### GTKWave / VCD Viewer

Convert the binary dump to VCD format:

```bash
tools/gentrace -v dump.bin trace.vcd
```

---

## Porting Guide

Follow these steps to integrate the trace library into your own FreeRTOS project.

### 1. Include the trace header

Add the following line to your `FreeRTOSConfig.h`:

```c
#include "FreeRTOS-Trace/FreeRTOS-Trace.h"
```

Enable tracing in config:

```c
#define configUSE_TRACE_FACILITY  1
#define configMAX_TRACE_EVENTS    4096   /* adjust for RAM budget */
#define configMAX_TRACE_TASKS     64
```

### 2. Implement the time source

Edit `FreeRTOS-Trace/btf_port.h` and define the `xGetCycles()` macro to return the current system 32-bit cycle counter:

```c
#define xGetCycles()  /* your platform timer, e.g. DWT cycle counter */
```

On non-RISC-V targets, remove the `#error` guard and provide your own port block.

### 3. Choose dump mode

| Mode | When to use | Configuration |
|------|-------------|---------------|
| **Buffer + host dump** | Production firmware, JTAG/mem dump | Do **not** define `PRINT_BTF_DUMP`; read `trace_data` from RAM after run |
| **Simulator auto-dump** | rvsim / custom ISS with syscall `0x99` | Define `HAVE_SYS_DUMP` (default on `__riscv` in `btf_port.h`) |
| **Live stdout BTF** | Quick bring-up only | Uncomment `#define PRINT_BTF_DUMP` in `btf_port.h`. Set `TIMESCALE_US` to `1` (microseconds, default) or `0` (nanoseconds) for the `#timeScale` header |

For real targets, keep events in RAM and dump the `trace_data` symbol after `traceEND()` — do not rely on `sys_dump()` unless your simulator or bootloader provides it.

### 4. Add the source file to your build

Compile `FreeRTOS-Trace/btf_trace.c` as part of your project.

### 5. Start and stop tracing

Call `traceSTART()` before the code you want to observe and `traceEND()` when done:

```c
#if configUSE_TRACE_FACILITY
    traceSTART();
#endif

/* ... code under observation ... */

#if configUSE_TRACE_FACILITY
    traceEND();
#endif
```

### 6. Locate the trace buffer

After building, use `readelf` to find the address and size of the `trace_data` symbol:

```bash
$ readelf -a task.elf | grep trace_data
21: 00021d44 65572 OBJECT  LOCAL  DEFAULT    4 trace_data
```

Run the application and dump the reported byte count from the reported address to a binary file (or use `rvsim`, which writes `dump.bin` automatically via the dump syscall).

### 7. Convert to BTF or VCD

```bash
# BTF format
$ tools/gentrace dump.bin trace.btf

# VCD format
$ tools/gentrace -v dump.bin trace.vcd
```

### 8. Open the trace

- **BTF:** open with `BTFViewer/btf_viewer.py`, the web viewer, or Eclipse Trace Compass.
- **VCD:** open with GTKWave or any compatible VCD viewer.

---

## Memory & configuration

Default trace buffer size is controlled by `configMAX_TRACE_EVENTS` and `configMAX_TRACE_TASKS` in `FreeRTOSConfig.h`. Each event is 12 bytes; task names add `max_tasks × max_taskname_len` bytes. The Demo uses 4096 events (~55 KB for events alone). When the ring buffer fills, older events are overwritten and a warning is printed.

---

## Known limitations

| Area | Notes |
|------|-------|
| **Task table overflow** | `btf_trace_add_task()` disables tracing when the task name table is full |
| **Parser parity** | BTF is parsed independently in Python (`btf_viewer.py`) and JavaScript (`btfParser.js`); no shared automated test vectors yet |
| **CI / unit tests** | No automated test suite in this repository; validate with `make run` and manual viewer smoke tests |
| **Web viewer** | Trace files stay client-side; session state is stored in browser `localStorage` keyed by filename |

---

## License

MIT License
