/**
 * Text for the in-app "Đã đốn cây" confirmation. The panel must not use window.confirm(): embedded
 * browsers (and pages where the user blocked dialogs) return false without showing anything, so the
 * button silently did nothing.
 */
export function removeTreeConfirmation(treeCode: string) {
  return {
    title: `Đã đốn cây ${treeCode}?`,
    description:
      "Cây sẽ được xóa khỏi bản đồ và danh sách cây đang hoạt động. Lịch sử chẩn đoán/kế hoạch chăm sóc vẫn được giữ lại.",
    confirmLabel: "Đã đốn cây",
  };
}
