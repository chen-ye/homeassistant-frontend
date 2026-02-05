import { describe, it, expect, vi } from "vitest";
import { getConfigSubpageTitle } from "../../src/data/panel";
import type { HomeAssistant } from "../../src/types";

vi.mock("../../src/data/integration", () => ({
  domainToName: vi.fn((_localize, domain) => `Localized ${domain}`),
}));

describe("getConfigSubpageTitle", () => {
  const localize = vi.fn((key) => {
    if (key === "automations") return "Automations";
    if (key === "ui.panel.config.dashboard.automations.main")
      return "Automations & scenes";
    if (key === "ui.panel.config.updates.caption") return "Updates";
    return undefined;
  });

  const hass = {
    localize,
    devices: {
      device_id_1: { name: "Device 1" },
      device_id_2: { name: "Device 2", name_by_user: "Custom Device 2" },
    },
    states: {
      "automation.test": {
        attributes: { friendly_name: "Test Automation" },
        entity_id: "automation.test",
      },
      "scene.test": { attributes: {}, entity_id: "scene.test" },
    },
  } as unknown as HomeAssistant;

  const configSections = {
    dashboard: [
      { path: "/config/automation", translationKey: "automations" },
      { path: "/config/updates", translationKey: "updates" },
    ],
  } as any;

  it("should return localized integration name", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/integrations/integration/mqtt",
      configSections
    );
    expect(title).toBe("Localized mqtt");
  });

  it("should return localized integration name with trailing slash", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/integrations/integration/mqtt/",
      configSections
    );
    expect(title).toBe("Localized mqtt");
  });

  it("should return device name", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/devices/device/device_id_1",
      configSections
    );
    expect(title).toBe("Device 1");
  });

  it("should return custom device name", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/devices/device/device_id_2",
      configSections
    );
    expect(title).toBe("Custom Device 2");
  });

  it("should return entity friendly name", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/entities/entity/automation.test",
      configSections
    );
    expect(title).toBe("Test Automation");
  });

  it("should return entity_id if friendly name is missing", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/entities/entity/scene.test",
      configSections
    );
    expect(title).toBe("scene.test");
  });

  it("should return automation name when editing", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/automation/edit/automation.test",
      configSections
    );
    expect(title).toBe("Test Automation");
  });

  it("should return formatted add-on name from info path", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/app/test_addon/info",
      configSections
    );

    expect(title).toBe("Add-on");
  });

  it("should return formatted add-on name from hassio path", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/hassio/addon/a0d7b954_adguard/info",
      configSections
    );

    expect(title).toBe("Add-on");
  });

  it("should return formatted add-on name from base path", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/app/test_addon",
      configSections
    );
    expect(title).toBe("Add-on");
  });

  it("should handle add-on slugs with multiple underscores", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/app/my_custom_addon",
      configSections
    );
    expect(title).toBe("Add-on");
  });

  it("should handle add-on slugs with leading/trailing underscores", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/app/_test_addon_",
      configSections
    );
    expect(title).toBe("Add-on");
  });

  it("should return localized title from translationKey", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/automation",
      configSections
    );
    expect(title).toBe("Automations");
  });

  it("should fallback to dashboard main translation", () => {
    localize.mockImplementation((key) => {
      if (key === "automations") return undefined;
      if (key === "ui.panel.config.dashboard.automations.main")
        return "Automations & scenes";
      return undefined;
    });
    const title = getConfigSubpageTitle(
      hass,
      "/config/automation",
      configSections
    );
    expect(title).toBe("Automations & scenes");
  });

  it("should fallback to caption translation", () => {
    localize.mockImplementation((key) => {
      if (key === "updates") return undefined;
      if (key === "ui.panel.config.dashboard.updates.main") return undefined;
      if (key === "ui.panel.config.updates.caption") return "Updates";
      return undefined;
    });
    const title = getConfigSubpageTitle(
      hass,
      "/config/updates",
      configSections
    );
    expect(title).toBe("Updates");
  });

  it("should return undefined if no match found", () => {
    const title = getConfigSubpageTitle(
      hass,
      "/config/unknown",
      configSections
    );
    expect(title).toBeUndefined();
  });
});
