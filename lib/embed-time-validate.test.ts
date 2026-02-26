import { describe, it, expect } from "vitest";
import { validateAppointmentTimes } from "./embed-time-validate";

describe("validateAppointmentTimes", () => {
  const future = new Date();
  future.setDate(future.getDate() + 1);
  future.setHours(14, 0, 0, 0);
  const startIso = future.toISOString();
  const endDate = new Date(future.getTime() + 30 * 60 * 1000);
  const endIso = endDate.toISOString();

  it("accepts valid future 30-min slot", () => {
    const r = validateAppointmentTimes(startIso, endIso);
    expect(r.valid).toBe(true);
  });

  it("rejects invalid start time", () => {
    expect(validateAppointmentTimes("", endIso).valid).toBe(false);
    expect(validateAppointmentTimes("not-a-date", endIso).valid).toBe(false);
  });

  it("rejects invalid end time", () => {
    expect(validateAppointmentTimes(startIso, "").valid).toBe(false);
  });

  it("rejects end before or equal to start", () => {
    expect(validateAppointmentTimes(startIso, startIso).valid).toBe(false);
    expect(validateAppointmentTimes(endIso, startIso).valid).toBe(false);
  });

  it("rejects past start time", () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    const pastStart = past.toISOString();
    const pastEnd = new Date(past.getTime() + 30 * 60 * 1000).toISOString();
    expect(validateAppointmentTimes(pastStart, pastEnd).valid).toBe(false);
    expect(validateAppointmentTimes(pastStart, pastEnd).error).toContain("future");
  });

  it("rejects duration below 15 minutes", () => {
    const endShort = new Date(future.getTime() + 10 * 60 * 1000).toISOString();
    expect(validateAppointmentTimes(startIso, endShort).valid).toBe(false);
    expect(validateAppointmentTimes(startIso, endShort).error).toContain("duration");
  });

  it("rejects duration over 120 minutes", () => {
    const endLong = new Date(future.getTime() + 121 * 60 * 1000).toISOString();
    expect(validateAppointmentTimes(startIso, endLong).valid).toBe(false);
  });

  it("rejects start more than 90 days ahead", () => {
    const far = new Date();
    far.setDate(far.getDate() + 91);
    far.setHours(12, 0, 0, 0);
    const farStart = far.toISOString();
    const farEnd = new Date(far.getTime() + 30 * 60 * 1000).toISOString();
    expect(validateAppointmentTimes(farStart, farEnd).valid).toBe(false);
    expect(validateAppointmentTimes(farStart, farEnd).error).toContain("90");
  });
});
