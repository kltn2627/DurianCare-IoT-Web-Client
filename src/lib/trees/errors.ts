/**
 * Vietnamese message for a farm-service error. `serverMessage` is the backend's `message` field
 * (FarmApiExceptionHandler); it is only used to pick a more precise message, never shown raw.
 */
export function treeErrorMessage(status: number, serverMessage: string) {
  const detail = serverMessage ?? "";
  if (status === 404 && detail === "Endpoint not found") {
    return "Máy chủ chưa có chức năng này (dịch vụ cây cần được cập nhật). Không có cây nào bị thay đổi.";
  }
  if (status === 409 && /after removal/i.test(detail)) {
    return "Cây đã được đốn khỏi bản đồ nên không thể thay đổi nữa. Vui lòng tải lại danh sách.";
  }
  const messages: Record<number, string> = {
    0: "Không thể kết nối dịch vụ cây. Vui lòng thử lại.",
    400: "Thông tin cây hoặc yêu cầu không hợp lệ. Vui lòng kiểm tra lại.",
    401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    403: "Bạn không có quyền thực hiện thao tác trên cây này.",
    404: "Không tìm thấy cây hoặc khu canh tác. Vui lòng tải lại danh sách.",
    405: "Máy chủ không hỗ trợ thao tác này. Không có cây nào bị thay đổi.",
    409: "Trạng thái hoặc dữ liệu cây đã thay đổi. Vui lòng tải lại trước khi thử lại.",
  };
  return status >= 500 ? "Dịch vụ cây đang gặp lỗi. Vui lòng thử lại sau." : messages[status] ?? "Yêu cầu không thành công.";
}
