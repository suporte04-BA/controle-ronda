import { formatManaus } from "./timezone";

export async function adicionarOverlay(
  blob: Blob,
  dados: { nome: string; setor: string },
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Contexto canvas indisponível"));
        return;
      }

      ctx.drawImage(img, 0, 0);

      const barHeight = Math.max(40, Math.floor(img.height * 0.07));
      const barY = img.height - barHeight;

      ctx.fillStyle = "rgba(10, 30, 60, 0.88)";
      ctx.fillRect(0, barY, img.width, barHeight);

      const now = formatManaus(new Date(), "dd/MM/yyyy HH:mm");
      const texto = `${dados.setor}  |  ${dados.nome.toUpperCase()}  |  ${now}`;

      const fontSize = Math.max(12, Math.floor(barHeight * 0.55));
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(texto, 12, barY + barHeight / 2);

      canvas.toBlob(
        (result) => {
          URL.revokeObjectURL(url);
          if (result) resolve(result);
          else reject(new Error("Falha ao gerar blob"));
        },
        "image/jpeg",
        0.9,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar imagem para overlay"));
    };

    img.src = url;
  });
}
