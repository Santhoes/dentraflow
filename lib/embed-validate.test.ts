import { describe, it, expect } from "vitest";
import { isValidChatEmail, isValidChatPhone } from "./embed-validate";

describe("isValidChatEmail", () => {
  it("accepts valid email", () => {
    expect(isValidChatEmail("user@example.com").valid).toBe(true);
    expect(isValidChatEmail("fgasdfg@gmail.com").valid).toBe(true);
    expect(isValidChatEmail("  User+tag@Example.COM  ").valid).toBe(true);
  });

  it("rejects empty or whitespace", () => {
    expect(isValidChatEmail("").valid).toBe(false);
    expect(isValidChatEmail("   ").valid).toBe(false);
    expect(isValidChatEmail("").error).toContain("required");
  });

  it("rejects invalid format", () => {
    expect(isValidChatEmail("notanemail").valid).toBe(false);
    expect(isValidChatEmail("@example.com").valid).toBe(false);
    expect(isValidChatEmail("user@").valid).toBe(false);
    expect(isValidChatEmail("user@.com").valid).toBe(false);
    expect(isValidChatEmail("user@example").valid).toBe(false);
    expect(isValidChatEmail("user@example.c").valid).toBe(false);
  });

  it("rejects disposable domains", () => {
    expect(isValidChatEmail("x@tempmail.com").valid).toBe(false);
    expect(isValidChatEmail("x@mailinator.com").valid).toBe(false);
  });

  it("rejects overly long email", () => {
    const long = "a".repeat(250) + "@b.com";
    expect(isValidChatEmail(long).valid).toBe(false);
    expect(isValidChatEmail(long).error).toContain("long");
  });
});

describe("isValidChatPhone", () => {
  it("accepts valid phone with enough digits", () => {
    expect(isValidChatPhone("1234567890").valid).toBe(true);
    expect(isValidChatPhone("+1 234 567 8901").valid).toBe(true);
    expect(isValidChatPhone("+44 20 7123 4567").valid).toBe(true);
  });

  it("rejects too few digits", () => {
    expect(isValidChatPhone("123").valid).toBe(false);
    expect(isValidChatPhone("123456789").valid).toBe(false);
  });

  it("rejects too long", () => {
    expect(isValidChatPhone("1234567890123456").valid).toBe(false);
  });

  it("rejects all same digit", () => {
    expect(isValidChatPhone("1111111111").valid).toBe(false);
  });

  it("rejects all zeros", () => {
    expect(isValidChatPhone("0000000000").valid).toBe(false);
  });
});
