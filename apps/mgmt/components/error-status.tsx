"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Icon } from "@bach/ui/components/icon";

/** Triage one error: fixed, ignore, or open again. */
export function ErrorStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function set(next: "open" | "resolved" | "ignored") {
    setBusy(true);
    setErr("");
    const { error } = await supabaseBrowser().rpc("set_error_status", { p_group_id: id, p_status: next });
    setBusy(false);
    if (error) setErr(`ما انحفظ: ${error.message}`);
    else router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status !== "resolved" ? (
          <Button size="sm" disabled={busy} onClick={() => void set("resolved")}>
            <Icon name="save" size={16} />
            انحلّ
          </Button>
        ) : null}
        {status !== "ignored" ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void set("ignored")}>
            <Icon name="hidden" size={16} />
            تجاهل
          </Button>
        ) : null}
        {status !== "open" ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void set("open")}>
            <Icon name="refresh" size={16} />
            رجّعو مفتوح
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {status === "resolved"
          ? "إذا رجع صار، بينفتح لحالو وبيوصلك إيميل."
          : status === "ignored"
            ? "متجاهَل: بيضل يتعدّ بس ما في تنبيه عنو."
            : "«انحلّ» بعد التصليح. «تجاهل» إذا هيدا خطأ عادي (متل «المخزون ما بيكفي») وما بدّك تنبيه عنو."}
      </p>
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
    </div>
  );
}
