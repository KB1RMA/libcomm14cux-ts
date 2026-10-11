// SPDX-License-Identifier: GPL-3.0-only
// Derived from libcomm14cux (https://github.com/colinbourassa/libcomm14cux)
// Copyright (C) Colin Bourassa. Licensed under the GNU GPL v3.
// Ported to TypeScript and modified for comm14cux-ts, 2026.

// [byte offset from 0x0049, bit (0 = LSB), name, factory fault code number].
// Spare bits are omitted.
// Names follow the field names of `c14cux_faultcodes`, except `misfireGeneral`,
// which has no C field. Code numbers are the bytes of the `.faultCodes` table
// in faults.asm of the 14CUX firmware disassembly
// (https://github.com/colinbourassa/14cux-firmware): each byte of the fault
// block lists its eight bits there in priority order, LSB first, as BCD (so
// $59 is code 59).
const FAULT_BITS = [
  [0, 0, 'romChecksumFailure', 29],
  [0, 1, 'lambdaSensorOdd', 44],
  [0, 2, 'lambdaSensorEven', 45],
  // Fault code 25. libcomm14cux treats this bit as spare, but the firmware
  // disassembly (ignitionInt.asm, faults.asm) sets it on a misfire in builds
  // before R3360. R3360 and later never set it.
  [0, 3, 'misfireGeneral', 25],
  [0, 4, 'misfireOddBank', 40],
  [0, 5, 'misfireEvenBank', 50],
  [0, 6, 'airflowMeter', 12],
  [0, 7, 'tuneResistorOutOfRange', 21],
  [1, 0, 'injectorOddBank', 34],
  [1, 2, 'injectorEvenBank', 36],
  [1, 3, 'coolantTempSensor', 14],
  [1, 4, 'throttlePot', 17],
  [1, 5, 'throttlePotHiMafLo', 18],
  [1, 6, 'throttlePotLoMafHi', 19],
  [1, 7, 'purgeValveLeak', 88],
  [2, 1, 'mixtureTooLean', 26],
  [2, 3, 'intakeAirLeak', 28],
  [3, 0, 'lowFuelPressure', 23],
  [3, 4, 'idleValveStepperMotor', 48],
  [3, 6, 'roadSpeedSensor', 68],
  [3, 7, 'neutralSwitch', 69],
  [4, 4, 'lowFuelPressureOrAirLeak', 59],
  [4, 5, 'fuelTempSensor', 15],
  [5, 6, 'batteryDisconnected', 2],
  [5, 7, 'ramChecksumFailure', 3],
] as const;

/**
 * Name of a fault flag in {@link FaultCodes}, taken from the field names of
 * the C `c14cux_faultcodes` struct. `misfireGeneral` has no C field.
 */
export type FaultCodeName = (typeof FAULT_BITS)[number][2];

/**
 * Factory fault code number for each flag in {@link FaultCodes}, as a
 * technician would read it ("fault 59"). Taken from the same table as the
 * decoder, so the two cannot drift apart.
 *
 * Some firmware builds never set some of these codes; the number identifies the
 * flag, not whether a given ECU can raise it.
 *
 * The numbers follow bit position in the firmware's priority table and match
 * the published Land Rover fault code lists. Those lists name cylinder banks
 * A and B rather than odd and even, so which bank is "odd" follows the C field
 * names.
 */
export const FAULT_CODE_NUMBERS: Readonly<Record<FaultCodeName, number>> =
  Object.freeze(
    Object.fromEntries(
      FAULT_BITS.map(([, , name, code]) => [name, code]),
    ) as Record<FaultCodeName, number>,
  );

/**
 * Fault code flags (`c14cux_faultcodes`); `true` means the fault is set.
 *
 * `misfireGeneral` (fault code 25, bit 3 of 0x0049) is not in the C struct.
 * The firmware disassembly shows that only builds before R3360 set it, so it
 * is not expected to be set on later firmware.
 */
export type FaultCodes = Record<FaultCodeName, boolean>;

/** Number of bytes in the fault code block at 0x0049. */
export const FAULT_CODE_BLOCK_SIZE = 6;

/**
 * Decodes the fault code block into named flags. Spare bits are ignored.
 *
 * @param bytes - The six bytes read from 0x0049.
 * @returns A flag for each fault; `true` means the fault is set.
 */
export function decodeFaultCodes(bytes: Uint8Array): FaultCodes {
  const codes = {} as FaultCodes;

  for (const [byteIndex, bit, name] of FAULT_BITS) {
    codes[name] = (((bytes[byteIndex] ?? 0) >> bit) & 1) === 1;
  }

  return codes;
}
