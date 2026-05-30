import html2canvas from "html2canvas";

export async function saveElementAsImage(
  sourceId: string,
  filename: string
): Promise<void> {
  const source = document.getElementById(sourceId);
  if (!source) {
    throw new Error("캡처할 영역을 찾을 수 없습니다.");
  }

  const clone = source.cloneNode(true) as HTMLElement;

  try {
    clone.querySelectorAll("[data-no-share]").forEach((el) => el.remove());

    clone.id = "";
    clone.style.position = "fixed";
    clone.style.left = "0";
    clone.style.top = "0";
    clone.style.zIndex = "-1";
    clone.style.width = `${source.offsetWidth}px`;
    clone.style.margin = "0";
    document.body.appendChild(clone);

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 100));

    const bg = getComputedStyle(source).backgroundColor;
    const canvas = await html2canvas(clone, {
      backgroundColor: bg === "rgba(0, 0, 0, 0)" ? null : bg,
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (doc) => {
        doc.querySelectorAll<HTMLElement>("*").forEach((el) => {
          el.style.overflow = "visible";
        });
      },
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png", 1);
    link.click();
  } finally {
    if (clone.parentNode) clone.parentNode.removeChild(clone);
  }
}
