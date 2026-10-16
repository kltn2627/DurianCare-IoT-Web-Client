export function treeErrorMessage(status: number, fallback: string) {
  const messages: Record<number, string> = {
    0: "Không thể kết nối dịch vụ cây. Vui lòng thử lại.",
    400: "Thông tin cây hoặc yêu cầu không hợp lệ. Vui lòng kiểm tra lại.",
    401: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    403: "Bạn không có quyền thực hiện thao tác trên cây này.",
    404: "Không tìm thấy cây hoặc khu canh tác. Vui lòng tải lại danh sách.",
    409: "Trạng thái hoặc dữ liệu cây đã thay đổi. Vui lòng tải lại trước khi thử lại.",
  };
  return status >= 500 ? "Dịch vụ cây đang gặp lỗi. Vui lòng thử lại sau." : messages[status] ?? fallback;
}
