export type FriendlyErrorScope = "auth" | "search" | "notification" | "general";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;
export const OTP_LENGTH = 6;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string) {
  const email = value.trim();
  if (!email) return "Vui lòng nhập email.";
  if (email.length > 320) return "Email quá dài.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Email chưa đúng định dạng.";
  }
  return "";
}

export function validatePassword(value: string) {
  if (!value) return "Vui lòng nhập mật khẩu.";
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return "Mật khẩu phải từ 12 đến 72 ký tự.";
  }
  return "";
}

export function validateConfirmPassword(password: string, confirmPassword: string) {
  if (!confirmPassword) return "Vui lòng nhập lại mật khẩu.";
  if (password !== confirmPassword) return "Hai mật khẩu chưa khớp.";
  return "";
}

export function validateOtp(value: string) {
  if (!value) return "Vui lòng nhập mã OTP.";
  if (!/^\d{6}$/.test(value)) return "Mã OTP phải gồm đúng 6 chữ số.";
  return "";
}

export function validatePhoneNumber(value: string) {
  const phone = value.trim();
  if (!phone) return "";
  if (!/^[0-9+() .-]{8,30}$/.test(phone)) {
    return "Số điện thoại chưa đúng định dạng.";
  }
  return "";
}

export function validateDateOfBirth(value: string) {
  const dateValue = value.trim();
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Ngày sinh chưa đúng định dạng.";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date >= today) return "Ngày sinh phải là ngày trong quá khứ.";
  return "";
}

export function validateMaxLength(value: string, maxLength: number, label: string) {
  if (value.trim().length > maxLength) {
    return `${label} không được vượt quá ${maxLength} ký tự.`;
  }
  return "";
}

export function validateProfileFullName(value: string) {
  if (!value.trim()) return "Vui lòng nhập họ và tên.";
  return validateMaxLength(value, 150, "Họ và tên");
}

export function validateAddress(value: string) {
  return validateMaxLength(value, 500, "Địa chỉ");
}

export function validateBio(value: string) {
  return validateMaxLength(value, 500, "Giới thiệu");
}

export function validateProvinceCity(value: string) {
  return validateMaxLength(value, 150, "Tỉnh / thành phố");
}

export function normalizeOtpInput(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function passwordRules(value: string) {
  const password = value ?? "";
  return [
    { key: "min", label: "Ít nhất 12 ký tự", passed: password.length >= PASSWORD_MIN_LENGTH },
    { key: "upper", label: "Có chữ hoa", passed: /[A-Z]/.test(password) },
    { key: "lower", label: "Có chữ thường", passed: /[a-z]/.test(password) },
    { key: "number", label: "Có chữ số", passed: /\d/.test(password) },
    { key: "special", label: "Có ký tự đặc biệt", passed: /[^A-Za-z0-9]/.test(password) },
  ] as const;
}

export function passwordStrength(value: string) {
  const rules = passwordRules(value);
  const score = rules.filter((rule) => rule.passed).length;

  if (value.length === 0) {
    return { label: "Very Weak", score: 0, percent: 0 };
  }

  if (score <= 1) return { label: "Very Weak", score, percent: 20 };
  if (score === 2) return { label: "Weak", score, percent: 40 };
  if (score === 3) return { label: "Medium", score, percent: 60 };
  if (score === 4) return { label: "Strong", score, percent: 80 };
  return { label: "Very Strong", score, percent: 100 };
}

export function friendlyApiMessage(
  input: {
    status?: number;
    message?: string;
  } | null | undefined,
  scope: FriendlyErrorScope,
  fallback: string,
) {
  const status = input?.status;
  const message = (input?.message ?? "").toLowerCase();

  if (scope === "auth") {
    if (status === 429) return "Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.";
    if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
    if (status === 503) return "Hệ thống đang bận. Vui lòng thử lại sau.";
    if (message.includes("otp")) return "Mã OTP không chính xác.";
    if (message.includes("email") && (message.includes("exist") || message.includes("used"))) {
      return "Email này đã được sử dụng.";
    }
    if (
      message.includes("password") ||
      message.includes("mật khẩu") ||
      message.includes("weak")
    ) {
      return "Mật khẩu chưa đáp ứng yêu cầu.";
    }
    if (message.includes("active") || message.includes("verification")) {
      return "Tài khoản chưa sẵn sàng đăng nhập.";
    }
  }

  if (scope === "search") {
    if (status === 401) return "Phiên tìm kiếm đã hết hạn. Vui lòng đăng nhập lại.";
    if (status === 403) return "Bạn không có quyền truy cập nội dung này.";
    if (status === 404) return "Không tìm thấy dữ liệu phù hợp.";
    if (status != null && status >= 500) return "Không thể tải kết quả tìm kiếm lúc này.";
  }

  if (scope === "notification") {
    if (status === 401) return "Phiên thông báo đã hết hạn. Vui lòng đăng nhập lại.";
    if (status === 403) return "Bạn không có quyền xem thông báo này.";
    if (status === 404) return "Thông báo này không còn tồn tại.";
    if (status != null && status >= 500) return "Không thể tải hộp thư thông báo lúc này.";
  }

  if (scope === "general") {
    if (status === 401) return "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.";
    if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
    if (status === 404) return "Không tìm thấy dữ liệu phù hợp.";
    if (status != null && status >= 500) return "Hệ thống đang bận. Vui lòng thử lại sau.";
  }

  return fallback;
}
