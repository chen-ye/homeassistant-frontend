import {
  mdiAccount,
  mdiCalendar,
  mdiChartBox,
  mdiClipboardList,
  mdiFormatListBulletedType,
  mdiLightningBolt,
  mdiPlayBoxMultiple,
  mdiTooltipAccount,
} from "@mdi/js";
import type { HomeAssistant, PanelInfo } from "../types";
import type { PageNavigation } from "../layouts/hass-tabs-subpage";
import type { LocalizeKeys } from "../common/translations/localize";
import { domainToName } from "./integration";

/** Panel to show when no panel is picked. */
export const DEFAULT_PANEL = "home";

export const hasLegacyOverviewPanel = (hass: HomeAssistant): boolean =>
  Boolean(hass.panels.lovelace?.config);

export const getLegacyDefaultPanelUrlPath = (): string | null => {
  const defaultPanel = window.localStorage.getItem("defaultPanel");
  return defaultPanel ? JSON.parse(defaultPanel) : null;
};

export const getDefaultPanelUrlPath = (hass: HomeAssistant): string => {
  const defaultPanel =
    hass.userData?.default_panel ||
    hass.systemData?.default_panel ||
    getLegacyDefaultPanelUrlPath() ||
    DEFAULT_PANEL;
  // If default panel is lovelace and no old overview exists, fall back to home
  if (defaultPanel === "lovelace" && !hasLegacyOverviewPanel(hass)) {
    return DEFAULT_PANEL;
  }
  return defaultPanel;
};

export const getDefaultPanel = (hass: HomeAssistant): PanelInfo => {
  const panel = getDefaultPanelUrlPath(hass);

  return (panel ? hass.panels[panel] : undefined) ?? hass.panels[DEFAULT_PANEL];
};

export const getPanelNameTranslationKey = (panel: PanelInfo) => {
  if (panel.url_path === "profile") {
    return "panel.profile" as const;
  }

  return `panel.${panel.title}` as const;
};

export const getPanelTitle = (
  hass: HomeAssistant,
  panel: PanelInfo
): string | undefined => {
  const translationKey = getPanelNameTranslationKey(panel);

  return hass.localize(translationKey) || panel.title || undefined;
};

export const getPanelTitleFromUrlPath = (
  hass: HomeAssistant,
  urlPath: string
): string | undefined => {
  if (!hass.panels) {
    return undefined;
  }

  const panel = Object.values(hass.panels).find(
    (p: PanelInfo): boolean => p.url_path === urlPath
  );

  if (!panel) {
    return undefined;
  }

  return getPanelTitle(hass, panel);
};

/**
 * Get subpage title for config panel routes.
 * Returns the specific subpage title (e.g., "Automations") if found,
 * or undefined to fall back to the panel title (e.g., "Settings").
 *
 * @param hass HomeAssistant instance
 * @param path Full route path (e.g., "/config/automation/dashboard")
 * @param configSections Config sections metadata for resolving subpage titles
 * @returns Localized subpage title, or undefined if not found
 */
export const getConfigSubpageTitle = (
  hass: HomeAssistant,
  path: string,
  configSections: Record<string, PageNavigation[]>
): string | undefined => {
  // Parse path into segments, ignoring empty ones (e.g., "/config/integrations/" -> ["config", "integrations"])
  const parts = path.split("/").filter(Boolean);

  // We only handle titles for config and hassio subpages
  if (parts.length < 2 || (parts[0] !== "config" && parts[0] !== "hassio")) {
    return undefined;
  }

  const [root, section, subSection, id] = parts;

  // Helper to extract a friendly name from an entity ID
  const getEntityTitle = (entityId: string) =>
    hass.states[entityId]
      ? hass.states[entityId].attributes.friendly_name ||
        hass.states[entityId].entity_id
      : undefined;

  /**
   * Route handlers for specific detail pages.
   * These provide highly specific titles (e.g., the name of a device or integration)
   * when the user is navigating deep into the configuration panel.
   */
  const handlers: Record<
    string,
    (args: { subSection?: string; id?: string }) => string | undefined
  > = {
    // /config/integrations/integration/<domain>
    integrations: (args) =>
      args.subSection === "integration" && args.id
        ? domainToName(hass.localize, args.id)
        : undefined,

    // /config/devices/device/<deviceId>
    devices: (args) => {
      if (args.subSection !== "device" || !args.id) {
        return undefined;
      }
      const device = hass.devices[args.id];
      return device ? device.name_by_user || device.name : undefined;
    },

    // /config/entities/entity/<entityId>
    entities: (args) =>
      args.subSection === "entity" && args.id
        ? getEntityTitle(args.id)
        : undefined,

    // /config/automation/edit/<entityId>
    automation: (args) =>
      args.subSection === "edit" && args.id
        ? getEntityTitle(args.id)
        : undefined,

    // /config/scene/edit/<entityId>
    scene: (args) =>
      args.subSection === "edit" && args.id
        ? getEntityTitle(args.id)
        : undefined,

    // /config/script/edit/<entityId>
    script: (args) =>
      args.subSection === "edit" && args.id
        ? getEntityTitle(args.id)
        : undefined,

    // /config/app/<slug> (Add-on detail page) or /hassio/addon/<slug>
    app: ({ subSection: slug }) => (slug ? "Add-on" : undefined),

    // /hassio/addon/<slug>
    addon: ({ subSection: slug }) => (slug ? "Add-on" : undefined),
  };

  // Check if we have a specific handler for this sub-route
  const handlerTitle = handlers[section]?.({ subSection, id });
  if (handlerTitle) {
    return handlerTitle;
  }

  // If we are in the hassio root, return undefined to fall back to panel title
  if (root === "hassio") {
    return undefined;
  }

  /**
   * Fallback: Search through config navigation metadata for a matching path.
   * This handles top-level categories like "Automations", "Updates", etc.
   */
  for (const sectionGroup of Object.values(configSections)) {
    const pageNav = sectionGroup.find((nav) => path.startsWith(nav.path));
    if (pageNav) {
      // If the page defines a translation key, try multiple lookup patterns
      if (pageNav.translationKey) {
        const candidateKeys = [
          pageNav.translationKey, // Direct lookup (e.g. "devices")
          `ui.panel.config.dashboard.${pageNav.translationKey}.main`, // Dashboard lookup (e.g. "ui.panel.config.dashboard.devices.main")
          `ui.panel.config.${pageNav.translationKey}.caption`, // Section lookup (e.g. "ui.panel.config.automation.caption")
        ];

        for (const key of candidateKeys) {
          const localized = hass.localize(key as LocalizeKeys);
          if (localized) {
            return localized;
          }
        }
      }

      // Fallback to the hardcoded name if translations are missing
      if (pageNav.name) {
        return pageNav.name;
      }
    }
  }
  return undefined;
};

export const getPanelIcon = (panel: PanelInfo): string | undefined => {
  if (!panel.icon) {
    switch (panel.component_name) {
      case "profile":
        return "mdi:account";
    }
  }

  return panel.icon || undefined;
};

export const PANEL_ICON_PATHS = {
  calendar: mdiCalendar,
  energy: mdiLightningBolt,
  history: mdiChartBox,
  logbook: mdiFormatListBulletedType,
  map: mdiTooltipAccount,
  profile: mdiAccount,
  "media-browser": mdiPlayBoxMultiple,
  todo: mdiClipboardList,
};

export const getPanelIconPath = (panel: PanelInfo): string | undefined =>
  PANEL_ICON_PATHS[panel.url_path];

export const FIXED_PANELS = ["profile", "config"];
