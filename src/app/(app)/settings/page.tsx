import { getSettings } from "@/actions/settings";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsClient settings={settings} />;
}