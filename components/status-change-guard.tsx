"use client";

import { useEffect } from "react";

export function StatusChangeGuard() {
  useEffect(() => {
    const enforceRolePermissions = () => {
      const isAdmin = document.querySelector(".demo-chip")?.textContent?.includes("ADMIN");
      const activityStatus = document.querySelector(".page-head .status-pill")?.textContent?.trim();
      const activityIsActive = activityStatus !== "Selesai" && activityStatus !== "Dibatalkan";
      document.querySelectorAll<HTMLElement>(".side-stack .link").forEach((button) => {
        if (button.textContent?.trim() === "Tambah") button.style.display = isAdmin || !activityIsActive ? "none" : "";
      });
      document.querySelectorAll<HTMLElement>(".side-stack .mini-form").forEach((form) => {
        form.style.display = isAdmin || !activityIsActive ? "none" : "";
      });
      document.querySelectorAll<HTMLButtonElement>(".status-actions button").forEach((button) => {
        button.disabled = Boolean(isAdmin);
        button.title = isAdmin ? "Status hanya dapat diperbarui oleh petugas yang ditugaskan" : "";
      });
    };

    const guard = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        ".status-actions button",
      );
      if (!button) return;

      const group = button.closest(".status-actions");
      const current = group?.querySelector<HTMLButtonElement>("button.selected");
      const from = current?.textContent?.trim() ?? "status saat ini";
      const to = button.textContent?.trim() ?? "status baru";

      if (button === current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (from === "Selesai") {
        event.preventDefault();
        event.stopPropagation();
        window.alert("Aktivitas yang sudah selesai bersifat final dan statusnya tidak dapat diubah.");
        return;
      }

      const approved = window.confirm(
        `Konfirmasi perubahan status\n\n${from} → ${to}\n\nPerubahan akan disimpan dalam riwayat aktivitas.`,
      );
      if (!approved) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", guard, true);
    enforceRolePermissions();
    const observer = new MutationObserver(enforceRolePermissions);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      document.removeEventListener("click", guard, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
