import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  CheckCircle2,
  CircleDot,
  Camera,
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
} from "@/lib/timezone";
import { getSignedFotoUrl } from "@/lib/storage";

export const Route = createFileRoute("/admin/ronda-detalhe/$id/$inicio")({
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

function Section({
  title,
  children,
  highlight,
}: {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        highlight
          ? "border-amber-200 bg-amber-50/50"
          : "border-border bg-muted/30"
      }`}
    >
      <div
        className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${
          highlight ? "text-amber-700" : "text-muted-foreground"
        }`}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
        {label}
      </div>
      <div
        className={`text-sm font-semibold ${
          mono ? "font-mono" : ""
        } ${accent ? "text-amber-700 text-lg" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}

function DetalheRonda() {
  const navigate = useNavigate();
  const { id: userId, inicio: inicioRaw } = Route.useParams();
  const inicio = inicioRaw ? decodeURIComponent(inicioRaw) : "";
  const [nome, setNome] = useState("");
  const [setor, setSetor] = useState("");
  const [passos, setPassos] = useState<PassoDetalhe[]>([]);
  const [observacoes, setObservacoes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!userId || !inicio) return;
        setLoading(true);

        const { data: prof } = await supabase
          .from("profiles")
          .select("nome,setor_id")
          .eq("id", userId)
          .single();
        if (cancelled) return;
        setNome(prof?.nome ?? "—");
        if (prof?.setor_id) {
          const { data: s } = await supabase
            .from("setores")
            .select("nome")
            .eq("id", prof.setor_id)
            .single();
          if (cancelled) return;
          setSetor(s?.nome ?? "—");
        }

        const { data: regs } = await supabase
          .from("registros_ponto")
          .select("id,tipo_acao,horario_acao,horario_foto,foto_url,observacoes")
          .eq("user_id", userId)
          .gte("horario_acao", inicio)
          .order("horario_acao", { ascending: true })
          .limit(20);

        if (cancelled) return;

        const ciclo: PassoDetalhe[] = [];
        let obs: string | null = null;
        for (const r of regs ?? []) {
          if (r.tipo_acao === "check_in" && ciclo.length > 0) break;
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

        if (cancelled) return;
        setPassos(comSigned);
        setObservacoes(obs);
      } catch (e) {
        console.error("Erro ao carregar detalhe da ronda:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, inicio]);

  const horaInicio = passos[0] ? formatHora(passos[0].horario_acao) : "—";
  const lastPasso = passos.length > 0 ? passos[passos.length - 1] : null;
  const horaFim =
    lastPasso?.tipo === "check_out_2"
      ? formatHora(lastPasso.horario_acao)
      : "Em andamento";
  const dataRef = passos[0] ? formatData(passos[0].horario_acao) : "—";
  const isCompleta = lastPasso?.tipo === "check_out_2";

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
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border shadow-sm no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/admin/relatorio-ronda" })}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao relatório
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" /> Imprimir
            </Button>
            <Button size="sm" onClick={gerarPdf}>
              <Download className="w-4 h-4 mr-1" /> Salvar PDF
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando ronda...</span>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Main card */}
          <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
            {/* Dark header */}
            <div className="bg-[#111827] px-6 sm:px-8 py-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src="/logo.png"
                    alt="BA Elétrica"
                    className="h-10 w-auto brightness-200 object-contain"
                  />
                  <div className="w-px h-10 bg-white/20" />
                  <div>
                    <div className="text-amber-400 text-xs font-bold uppercase tracking-widest">
                      Detalhe da Ronda
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {nome}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                      isCompleta
                        ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {isCompleta ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <CircleDot className="w-3.5 h-3.5 animate-pulse" />
                    )}
                    {isCompleta ? "Concluída" : "Em Andamento"}
                  </span>
                </div>
              </div>
              <div className="h-1 bg-amber-500 mt-4 rounded-full" />
            </div>

            {/* Content body */}
            <div className="px-6 sm:px-8 py-6 space-y-6">
              {/* Dados do Colaborador + Dados da Ronda */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Section title="Dados do Colaborador">
                  <div className="space-y-3">
                    <Field label="Colaborador" value={nome} />
                    <Field label="Setor" value={setor} />
                    <Field label="ID" value={userId?.slice(0, 8) ?? "—"} mono />
                  </div>
                </Section>
                <Section title="Dados da Ronda" highlight>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Data" value={dataRef} />
                    <Field label="Status" value={isCompleta ? "Concluída" : "Em Andamento"} />
                    <Field label="Início" value={horaInicio} mono />
                    <Field label="Fim" value={horaFim} mono />
                  </div>
                </Section>
              </div>

              {/* Resumo */}
              <Section title="Resumo">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="rounded-lg bg-background p-3 border border-border">
                    <div className="text-2xl font-bold text-foreground">{passos.length}</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      Fotos
                    </div>
                  </div>
                  <div className="rounded-lg bg-background p-3 border border-border">
                    <div className="text-2xl font-bold text-foreground">
                      {passos.filter((p) => p.tipo === "check_in").length}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      Check-ins
                    </div>
                  </div>
                  <div className="rounded-lg bg-background p-3 border border-border">
                    <div className="text-2xl font-bold text-foreground">
                      {passos.filter((p) => p.tipo === "check_out_2").length}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      Check-outs
                    </div>
                  </div>
                  <div className="rounded-lg bg-background p-3 border border-border">
                    <div className="text-2xl font-bold text-foreground">
                      {passos.filter((p) => !["check_in", "check_out_2"].includes(p.tipo)).length}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      Rondas
                    </div>
                  </div>
                </div>
              </Section>

              {/* Observações — ACIMA das fotos */}
              {observacoes && (
                <Section title="Observações" highlight>
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground">
                    {observacoes}
                  </p>
                </Section>
              )}

              {/* Registro Fotográfico — grid 4x4x2 */}
              <Section title="Registro Fotográfico">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {passos.map((p, idx) => {
                    const borderColor =
                      p.tipo === "check_in"
                        ? "border-green-500"
                        : p.tipo === "check_out_2"
                          ? "border-amber-500"
                          : "border-primary";
                    const badgeColor =
                      p.tipo === "check_in"
                        ? "bg-green-500/10 text-green-600"
                        : p.tipo === "check_out_2"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-primary/10 text-primary";
                    const tipoLabel = TIPO_ACAO_LABEL[p.tipo] ?? p.tipo;
                    return (
                      <div
                        key={p.id}
                        className={`bg-background border-2 ${borderColor} rounded-xl overflow-hidden group cursor-pointer`}
                        onClick={() => setFotoExpandida(p.signedUrl ?? null)}
                      >
                        {p.signedUrl ? (
                          <img
                            src={p.signedUrl}
                            alt={tipoLabel}
                            className="w-full aspect-square object-cover group-hover:opacity-80 transition-opacity"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-muted flex items-center justify-center">
                            <Camera className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="px-2 py-1.5 border-t border-border">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${badgeColor}`}>
                              {idx + 1}. {tipoLabel}
                            </span>
                          </div>
                          <div className="text-[9px] text-muted-foreground font-mono mt-0.5 space-y-0">
                            <div className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{nome}</div>
                            <div className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{setor}</div>
                            <div>{formatData(p.horario_acao)} • {formatHora(p.horario_acao)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            </div>

            {/* Footer */}
            <div className="px-6 sm:px-8 py-4 border-t border-border bg-muted/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="BA Elétrica" className="h-4 w-auto opacity-60" />
                  <span>BA ELÉTRICA — Sistema de Controle de Ronda</span>
                </div>
                <span>Gerado em {new Date().toLocaleString("pt-BR")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox foto */}
      {fotoExpandida && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 no-print"
          onClick={() => setFotoExpandida(null)}
        >
          <img
            src={fotoExpandida}
            alt="Foto ampliada"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-bold"
            onClick={() => setFotoExpandida(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
