import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Printer,
  Download,
  Loader2,
  Clock,
  Calendar,
  User,
  MapPin,
} from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  formatData,
  formatHora,
  formatManaus,
  TIPO_ACAO_LABEL,
  CICLO_RONDA,
} from "@/lib/timezone";
import { getSignedFotoUrl } from "@/lib/storage";

export const Route = createFileRoute("/admin/relatorio-ronda/$id/$inicio")({
  component: DetalheRonda,
});

interface PassoDetalhe {
  id: string;
  tipo: string;
  horario_acao: string;
  horario_foto: string;
  foto_url: string;
  signedUrl?: string;
}

function DetalheRonda() {
  const { id: userId, inicio: inicioRaw } = Route.useParams();
  const inicio = inicioRaw ? decodeURIComponent(inicioRaw) : "";
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("");
  const [passos, setPassos] = useState<PassoDetalhe[]>([]);
  const [observacoes, setObservacoes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!userId || !inicio) return;
      setLoading(true);

      const { data: prof } = await supabase
        .from("profiles")
        .select("nome,setor_id")
        .eq("id", userId)
        .single();
      setNome(prof?.nome ?? "—");
      if (prof?.setor_id) {
        const { data: s } = await supabase
          .from("setores")
          .select("nome")
          .eq("id", prof.setor_id)
          .single();
        setSetor(s?.nome ?? "—");
      }

      const { data: regs } = await supabase
        .from("registros_ponto")
        .select("id,tipo_acao,horario_acao,horario_foto,foto_url,observacoes")
        .eq("user_id", userId)
        .gte("horario_acao", inicio)
        .order("horario_acao", { ascending: true })
        .limit(20);

      const ciclo: PassoDetalhe[] = [];
      let obs: string | null = null;
      for (const r of regs ?? []) {
        ciclo.push({
          id: r.id,
          tipo: r.tipo_acao,
          horario_acao: r.horario_acao,
          horario_foto: r.horario_foto,
          foto_url: r.foto_url,
        });
        if (r.observacoes) obs = r.observacoes;
        if (r.tipo_acao === "check_out_2" && ciclo.length > 1) break;
      }

      const comSigned = await Promise.all(
        ciclo.map(async (p) => {
          const url = await getSignedFotoUrl(p.foto_url, 3600);
          return { ...p, signedUrl: url ?? undefined };
        }),
      );

      setPassos(comSigned);
      setObservacoes(obs);
      setLoading(false);
    })();
  }, [userId, inicio]);

  const horaInicio = passos[0] ? formatHora(passos[0].horario_acao) : "—";
  const lastPasso = passos.length > 0 ? passos[passos.length - 1] : null;
  const horaFim =
    lastPasso?.tipo === "check_out_2"
      ? formatHora(lastPasso.horario_acao)
      : "Em andamento";
  const dataRef = passos[0] ? formatData(passos[0].horario_acao) : "—";

  const gerarPdf = async () => {
    const id = toast.loading("Gerando PDF...");
    try {
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const fontB = await pdf.embedFont(StandardFonts.HelveticaBold);
      const pageW = 595;
      const pageH = 842;
      const marginX = 36;
      const tableW = pageW - marginX * 2;

      const brandRed = rgb(0.83, 0.15, 0.12);
      const navyBlue = rgb(0.12, 0.17, 0.33);
      const darkText = rgb(0.07, 0.09, 0.15);
      const grayText = rgb(0.45, 0.48, 0.53);
      const borderColor = rgb(0.88, 0.9, 0.93);
      const lightGray = rgb(0.96, 0.97, 0.98);
      const white = rgb(1, 1, 1);
      const softRed = rgb(0.99, 0.93, 0.93);

      let page = pdf.addPage([pageW, pageH]);
      let y = pageH - 40;

      const draw = (
        txt: string,
        xPos: number,
        yPos: number,
        size: number,
        bold = false,
        color = darkText,
      ) => {
        page.drawText(txt, {
          x: xPos,
          y: yPos,
          size,
          font: bold ? fontB : font,
          color,
        });
      };

      // Header
      page.drawRectangle({
        x: 0,
        y: pageH - 10,
        width: pageW,
        height: 10,
        color: brandRed,
      });
      draw("BA ELÉTRICA", marginX, y, 18, true, brandRed);
      y -= 16;
      draw("Sistema de Controle de Ronda", marginX, y, 10, false, navyBlue);
      y -= 14;
      draw("Detalhe da Ronda — Auditoria Individual", marginX, y, 9, false, grayText);
      y -= 20;

      page.drawLine({
        start: { x: marginX, y },
        end: { x: pageW - marginX, y },
        thickness: 2,
        color: brandRed,
      });
      y -= 24;

      // Info card
      const cardH = 80;
      page.drawRectangle({
        x: marginX,
        y: y - cardH,
        width: tableW,
        height: cardH,
        borderColor,
        borderWidth: 0.8,
        color: lightGray,
      });
      page.drawRectangle({
        x: marginX,
        y: y - cardH,
        width: 4,
        height: cardH,
        color: brandRed,
      });

      const cp = marginX + 16;
      draw("COLABORADOR", cp, y - 14, 7, true, grayText);
      draw("SETOR", cp + 250, y - 14, 7, true, grayText);
      draw("DATA", cp + 400, y - 14, 7, true, grayText);
      draw(nome.slice(0, 30), cp, y - 28, 11, true, darkText);
      draw(setor, cp + 250, y - 28, 9, false, darkText);
      draw(dataRef, cp + 400, y - 28, 9, false, darkText);
      draw("INÍCIO", cp, y - 50, 7, true, grayText);
      draw("FIM", cp + 120, y - 50, 7, true, grayText);
      draw(horaInicio, cp, y - 64, 10, false, darkText);
      draw(horaFim, cp + 120, y - 64, 10, false, darkText);

      y -= cardH + 24;

      // Photos
      const photoW = tableW - 20;
      const photoMaxH = 300;

      for (let i = 0; i < passos.length; i++) {
        const p = passos[i];
        const needed = photoMaxH + 80;
        if (y - needed < 80) {
          page = pdf.addPage([pageW, pageH]);
          y = pageH - 36;
          page.drawRectangle({
            x: 0,
            y: pageH - 8,
            width: pageW,
            height: 8,
            color: brandRed,
          });
        }

        const accent =
          p.tipo === "check_in"
            ? rgb(0.16, 0.63, 0.33)
            : p.tipo === "check_out_2"
              ? rgb(0.85, 0.55, 0.1)
              : brandRed;

        draw(`${TIPO_ACAO_LABEL[p.tipo] ?? p.tipo}`, marginX, y - 4, 10, true, accent);
        draw(
          `Captura: ${formatManaus(p.horario_acao)}  |  Envio: ${formatManaus(p.horario_foto)}`,
          marginX,
          y - 18,
          7,
          false,
          grayText,
        );
        y -= 28;

        if (p.signedUrl) {
          try {
            const imgRes = await fetch(p.signedUrl);
            if (imgRes.ok) {
              const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
              let img;
              try {
                img = await pdf.embedJpg(imgBytes);
              } catch {
                img = await pdf.embedPng(imgBytes);
              }
              const scale = Math.min(photoW / img.width, photoMaxH / img.height, 1);
              const dw = img.width * scale;
              const dh = img.height * scale;
              page.drawRectangle({
                x: marginX + 10 - 2,
                y: y - dh - 2,
                width: dw + 4,
                height: dh + 4,
                borderColor,
                borderWidth: 0.5,
              });
              page.drawImage(img, {
                x: marginX + 10,
                y: y - dh,
                width: dw,
                height: dh,
              });
              y -= dh + 16;
            }
          } catch {
            draw("Erro ao carregar imagem", marginX + 10, y - 20, 8, false, grayText);
            y -= 30;
          }
        } else {
          page.drawRectangle({
            x: marginX + 10,
            y: y - 60,
            width: photoW,
            height: 60,
            borderColor,
            borderWidth: 0.5,
            color: lightGray,
          });
          draw("Foto indisponível", marginX + photoW / 2 - 36, y - 28, 8, false, grayText);
          y -= 72;
        }
      }

      // Observations
      if (observacoes) {
        y -= 10;
        draw("OBSERVAÇÃO", marginX, y, 9, true, brandRed);
        y -= 14;
        const obsWords = observacoes.split(/\s+/);
        let obsLine = "";
        const obsLines: string[] = [];
        for (const w of obsWords) {
          const test = obsLine ? `${obsLine} ${w}` : w;
          if (font.widthOfTextAtSize(test, 8) > tableW - 20 && obsLine) {
            obsLines.push(obsLine);
            obsLine = w;
          } else {
            obsLine = test;
          }
        }
        if (obsLine) obsLines.push(obsLine);

        page.drawRectangle({
          x: marginX,
          y: y - obsLines.length * 13 - 12,
          width: tableW,
          height: obsLines.length * 13 + 12,
          borderColor: brandRed,
          borderWidth: 0.8,
          color: softRed,
        });
        page.drawRectangle({
          x: marginX,
          y: y - obsLines.length * 13 - 12,
          width: 4,
          height: obsLines.length * 13 + 12,
          color: brandRed,
        });
        obsLines.forEach((ln, li) => {
          draw(ln, marginX + 12, y - 10 - li * 13, 8, false, darkText);
        });
      }

      const pdfBytes = await pdf.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ronda_${nome.replace(/[\\/:*?"<>|\s]+/g, "_")}_${dataRef.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF baixado!", { id });
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "desconhecido"}`, { id });
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-3xl mx-auto">
      <header className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => { window.close(); }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Fechar aba
        </button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> Imprimir
          </Button>
          <Button size="sm" onClick={gerarPdf}>
            <Download className="w-4 h-4 mr-1" /> Salvar PDF
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Info */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <User className="w-5 h-5" />
              </span>
              <div>
                <div className="font-bold text-lg">{nome}</div>
                <div className="text-sm text-muted-foreground">{setor}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Data
                </div>
                <div className="font-medium">{dataRef}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Início
                </div>
                <div className="font-medium font-mono">{horaInicio}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Fim
                </div>
                <div className="font-medium font-mono">{horaFim}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 inline" /> Fotos
                </div>
                <div className="font-medium">{passos.length}</div>
              </div>
            </div>
          </div>

          {/* Passos */}
          <div className="space-y-4">
            {passos.map((p, idx) => {
              const accent =
                p.tipo === "check_in"
                  ? "border-l-green-500"
                  : p.tipo === "check_out_2"
                    ? "border-l-amber-500"
                    : "border-l-primary";
              return (
                <div
                  key={p.id}
                  className={`bg-card border border-border border-l-4 ${accent} rounded-xl overflow-hidden shadow-sm`}
                >
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">
                        {idx + 1}. {TIPO_ACAO_LABEL[p.tipo] ?? p.tipo}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        Captura: {formatManaus(p.horario_acao)} | Envio:{" "}
                        {formatManaus(p.horario_foto)}
                      </div>
                    </div>
                  </div>
                  {p.signedUrl ? (
                    <img
                      src={p.signedUrl}
                      alt={TIPO_ACAO_LABEL[p.tipo] ?? p.tipo}
                      className="w-full object-cover max-h-96"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground text-sm">
                      Foto indisponível
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Observação */}
          {observacoes && (
            <div className="bg-card border border-l-4 border-l-red-500 border-border rounded-xl p-5 shadow-sm">
              <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                Observação
              </div>
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {observacoes}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
