interface Props {
  className?: string;
  showText?: boolean;
}

export function BrandLogo({ className = "h-12", showText = false }: Props) {
  return (
    <div className="inline-flex items-center gap-3">
      <img src="/logo.png" alt="BA Elétrica" className={className} />
      {showText && (
        <div className="leading-tight">
          <div className="font-extrabold tracking-tight text-foreground text-lg">BA Elétrica</div>
          <div className="text-[11px] text-muted-foreground">Controle de Ponto</div>
        </div>
      )}
    </div>
  );
}
