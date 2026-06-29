"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Settings2, ArrowLeft } from "lucide-react";
import { updateSettings } from "@/actions/settings";
import type { AppSettings, ActionResult } from "@/types";

const settingsSchema = z.object({
  companyName: z.string().optional(),
  companyLogo: z.string().optional(),
  applicationName: z.string().optional(),
  defaultSenderEmail: z.string().optional(),
  defaultCc: z.string().optional(),
  defaultBcc: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SettingsClientProps {
  settings: AppSettings | null;
}

export function SettingsClient({ settings }: SettingsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: settings?.companyName || "",
      companyLogo: settings?.companyLogo || "",
      applicationName: settings?.applicationName || "",
      defaultSenderEmail: settings?.defaultSenderEmail || "",
      defaultCc: settings?.defaultCc?.join("\n") || "",
      defaultBcc: settings?.defaultBcc?.join("\n") || "",
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("companyName", data.companyName || "");
      formData.append("companyLogo", data.companyLogo || "");
      formData.append("applicationName", data.applicationName || "");
      formData.append("defaultSenderEmail", data.defaultSenderEmail || "");
      formData.append("defaultCc", data.defaultCc || "");
      formData.append("defaultBcc", data.defaultBcc || "");

      const result: ActionResult<AppSettings> = await updateSettings(null, formData);
      if (result.success) {
        toast.success(result.message || "Settings saved!");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/dashboard")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="flex items-center gap-2">
        <Settings2 className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage application settings</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" {...register("companyName")} placeholder="Your Company" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicationName">Application Name</Label>
                <Input id="applicationName" {...register("applicationName")} placeholder="Performance Tracker" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyLogo">Company Logo URL (Optional)</Label>
              <Input id="companyLogo" {...register("companyLogo")} placeholder="https://example.com/logo.png" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultSenderEmail">Default Sender Email</Label>
              <Input id="defaultSenderEmail" type="email" {...register("defaultSenderEmail")} placeholder="noreply@company.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultCc">Default CC Recipients</Label>
              <Textarea
                id="defaultCc"
                {...register("defaultCc")}
                placeholder="One email per line"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultBcc">Default BCC Recipients</Label>
              <Textarea
                id="defaultBcc"
                {...register("defaultBcc")}
                placeholder="One email per line"
                rows={3}
              />
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> SMTP credentials are configured via environment variables
                and cannot be changed from this interface.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}