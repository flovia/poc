// Server async component. cookie を直接読むので Client Component に置けない.
// design.md §5.3: provider layout の最上段 (sidebar/main の外) に置くことで,
// provider layout の skeleton 表示中でもバーが見える.

import { getServerDashboardMode } from "@/lib/data-mode";
import { UiText } from "@/lib/frontend-locale";

export async function SdkPreviewNoticeBar() {
  const mode = await getServerDashboardMode();
  if (mode !== "sdkConnected") return null;
  return (
    <div role="status" className="sdk-notice">
      <span className="sdk-notice-dot" aria-hidden="true">
        ●
      </span>
      <UiText
        en="Preview: this is what your dashboard looks like with the Flovia SDK installed (mock data)."
        ja="プレビュー: Flovia SDK を導入した場合のダッシュボード表示です（モックデータ）。"
      />
    </div>
  );
}
