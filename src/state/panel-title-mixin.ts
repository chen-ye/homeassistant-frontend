import type { PropertyValues } from "lit";
import type { HASSDomEvent } from "../common/dom/fire_event";
import { getConfigSubpageTitle, getPanelTitleFromUrlPath } from "../data/panel";
import { configSections } from "../panels/config/ha-panel-config";
import type { Constructor, HomeAssistant } from "../types";
import type { HassBaseEl } from "./hass-base-mixin";

const setPageTitle = (title: string | undefined) => {
  document.title = title ? `${title} – Home Assistant` : "Home Assistant";
};

const getRoutePath = (): string =>
  // In demo mode, use hash; otherwise use pathname
  __DEMO__ ? window.location.hash.substring(1) : window.location.pathname;

export const panelTitleMixin = <T extends Constructor<HassBaseEl>>(
  superClass: T
) =>
  class extends superClass {
    private _previousPath?: string;

    private _overrideTitle?: string;

    public connectedCallback() {
      super.connectedCallback();
      this.addEventListener(
        "ha-change-page-title",
        this._handlePageTitleChange
      );
    }

    public disconnectedCallback() {
      super.disconnectedCallback();
      this.removeEventListener(
        "ha-change-page-title",
        this._handlePageTitleChange
      );
    }

    private _handlePageTitleChange = (ev: HASSDomEvent<{ title: string }>) => {
      this._overrideTitle = ev.detail.title;
      if (this._overrideTitle) {
        setPageTitle(this._overrideTitle);
      }
    };

    protected updated(changedProps: PropertyValues): void {
      super.updated(changedProps);
      if (!changedProps.has("hass") || !this.hass) {
        return;
      }

      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      const currentPath = getRoutePath();

      if (this._previousPath !== currentPath) {
        this._previousPath = currentPath;
        this._overrideTitle = undefined;
      }

      // Update title when panel, localize, or route path changes
      if (
        !oldHass ||
        oldHass.panels !== this.hass.panels ||
        oldHass.panelUrl !== this.hass.panelUrl ||
        oldHass.localize !== this.hass.localize ||
        !this._previousPath // Ensure we run if path just changed (though handled above, logic flow)
      ) {
        if (this._overrideTitle) {
          setPageTitle(this._overrideTitle);
          return;
        }

        let title: string | undefined;

        // Try to get specific subpage title for config or hassio panel
        if (
          this.hass.panelUrl === "config" ||
          this.hass.panelUrl === "hassio"
        ) {
          title = getConfigSubpageTitle(this.hass, currentPath, configSections);
        }

        // Fall back to panel title
        if (!title) {
          title = getPanelTitleFromUrlPath(this.hass, this.hass.panelUrl);
        }

        setPageTitle(title);
      }
    }
  };
