/**
 * Discord 웹훅 알림 (서버 전용 — .env.local의 DISCORD_WEBHOOK_URL)
 */

function isValidDiscordWebhookUrl(url: string): boolean {
  if (!url) return false;
  if (
    url.includes("xxx") ||
    url.includes("숫자") ||
    url.includes("토큰") ||
    url.includes("your-") ||
    url.includes("여기에")
  ) {
    return false;
  }
  return /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+/.test(
    url
  );
}

export async function sendDiscordNotification(
  title: string,
  body: string
): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.warn(
      "[Discord] DISCORD_WEBHOOK_URL이 .env.local에 없습니다. Discord 웹후크 URL을 추가하고 dev 서버를 재시작하세요."
    );
    return false;
  }
  if (!isValidDiscordWebhookUrl(webhookUrl)) {
    console.warn(
      "[Discord] DISCORD_WEBHOOK_URL이 올바르지 않습니다. Discord에서 복사한 전체 URL(https://discord.com/api/webhooks/...)을 넣고 Ctrl+S 저장 후 재시작하세요."
    );
    return false;
  }

  const text = `**${title}**\n${body}`.slice(0, 2000);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "StockSim",
        content: text,
      }),
    });

    if (!res.ok) {
      console.warn("[Discord] 알림 실패 HTTP", res.status);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[Discord] 알림 오류:", err);
    return false;
  }
}

export function formatFeedbackDiscordMessage(
  content: string,
  userEmail?: string | null
): { title: string; body: string } {
  const isStockRequest = content.startsWith("[종목 추가 요청]");
  const title = isStockRequest ? "📈 종목 추가 요청" : "💬 서비스 의견";

  const lines = [content];
  if (userEmail) lines.push("", `계정: ${userEmail}`);

  return { title, body: lines.join("\n") };
}
