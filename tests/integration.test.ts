import { afterAll, describe, expect, it } from "vitest";
import { resetDbForTests } from "../lib/db";
import { registerUser } from "../lib/auth";
import { createInvite, joinWorkspace, listMembers, getMembership } from "../lib/workspaces";
import {
  consumePairingCode,
  createPairingCode,
  deviceByToken,
  listDevices,
  revokeDevice,
  touchDevice,
} from "../lib/devices";
import {
  activeShare,
  isShareLive,
  recordFrame,
  startShare,
  stopShare,
} from "../lib/share";
import { clearFrame, getFrame, setFrame, FRAME_TTL_MS } from "../lib/frames";
import { listAudit } from "../lib/audit";

afterAll(() => resetDbForTests());

const suffix = Math.random().toString(36).slice(2, 8);

describe("end-to-end device lifecycle", () => {
  it("registers a user with a personal workspace", async () => {
    const { user, workspaceId } = await registerUser({
      name: "سارة",
      email: `sara-${suffix}@example.com`,
      password: "strong-password",
    });
    expect(user.email).toBe(`sara-${suffix}@example.com`);
    expect(getMembership(user.id, workspaceId)?.role).toBe("owner");
  });

  it("pairs a device exactly once, updates it, and revokes it", async () => {
    const { user, workspaceId } = await registerUser({
      name: "خالد",
      email: `khaled-${suffix}@example.com`,
      password: "strong-password",
    });

    const { code } = createPairingCode(workspaceId, user.id);
    const paired = consumePairingCode({ code, name: "هاتف خالد" });
    expect(paired.device.workspace_id).toBe(workspaceId);
    expect(deviceByToken(paired.token)?.id).toBe(paired.device.id);
    expect(() => consumePairingCode({ code, name: "مرة أخرى" })).toThrow();

    touchDevice(paired.device.id, {
      batteryLevel: 74,
      charging: true,
      networkType: "wifi",
    });
    const devices = listDevices(workspaceId);
    expect(devices).toHaveLength(1);
    expect(devices[0]?.battery_level).toBe(74);
    expect(devices[0]?.battery_charging).toBe(1);
    expect(devices[0]?.online).toBe(true);

    expect(revokeDevice(workspaceId, paired.device.id, user.id, "owner")).toBe(
      true,
    );
    expect(deviceByToken(paired.token)).toBeNull();
    expect(listDevices(workspaceId)).toHaveLength(0);
    expect(
      revokeDevice(workspaceId, paired.device.id, user.id, "viewer"),
    ).toBe(false);
  });

  it("tracks share sessions and frame freshness", async () => {
    const { user, workspaceId } = await registerUser({
      name: "نورة",
      email: `noura-${suffix}@example.com`,
      password: "strong-password",
    });
    const { code } = createPairingCode(workspaceId, user.id);
    const { device } = consumePairingCode({ code, name: "جهاز المشاركة" });

    const share = startShare(device.id, 1_000);
    expect(activeShare(device.id, 1_500)?.id).toBe(share.id);
    expect(recordFrame(share.id, 1_500)).toBe(true);
    const live = activeShare(device.id, 2_000);
    expect(isShareLive(live, 2_000)).toBe(true);
    expect(isShareLive(live, 2_000 + 6_000)).toBe(false);
    stopShare(device.id, 3_000);
    expect(activeShare(device.id, 3_500)).toBeNull();
  });

  it("expires frames after the TTL", () => {
    setFrame("dev-frame", "shr", Buffer.from("image"), "image/jpeg", 1_000);
    expect(getFrame("dev-frame", 1_000 + FRAME_TTL_MS)?.bytes).toEqual(
      Buffer.from("image"),
    );
    expect(getFrame("dev-frame", 1_001 + FRAME_TTL_MS)).toBeNull();
    clearFrame("dev-frame");
  });

  it("invites a member and enforces roles", async () => {
    const owner = await registerUser({
      name: "منى",
      email: `mona-${suffix}@example.com`,
      password: "strong-password",
    });
    const guest = await registerUser({
      name: "ليان",
      email: `layan-${suffix}@example.com`,
      password: "strong-password",
    });

    const { code } = createInvite(owner.workspaceId, owner.user.id, "viewer");
    const joined = joinWorkspace(guest.user.id, code);
    expect(joined.workspaceId).toBe(owner.workspaceId);
    expect(getMembership(guest.user.id, owner.workspaceId)?.role).toBe("viewer");

    const members = listMembers(owner.workspaceId);
    expect(members.map((m) => m.role).sort()).toEqual(["owner", "viewer"]);
    expect(() => joinWorkspace(guest.user.id, "ZZZZ-ZZZZ")).toThrow();
  });

  it("writes audit records for pairing", async () => {
    const { user, workspaceId } = await registerUser({
      name: "عمر",
      email: `omar-${suffix}@example.com`,
      password: "strong-password",
    });
    const { code } = createPairingCode(workspaceId, user.id);
    consumePairingCode({ code, name: "جهاز عمر" });
    const events = listAudit(workspaceId);
    expect(events.some((event) => event.action === "device.pair")).toBe(true);
  });
});
