/** 사용자에게 보여줄 로그인 오류 문구 (기술 메시지는 숨김) */
export const AUTH_ERROR_USER_MESSAGE =
  "Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";

export function toUserAuthMessage(_raw?: string | null): string {
  return AUTH_ERROR_USER_MESSAGE;
}
