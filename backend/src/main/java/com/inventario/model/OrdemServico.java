package com.inventario.model;

import com.inventario.model.enums.*;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ordens_servico", indexes = {
    @Index(name = "idx_os_computador", columnList = "computador_id"),
    @Index(name = "idx_os_status", columnList = "status"),
    @Index(name = "idx_os_prioridade", columnList = "prioridade"),
    @Index(name = "idx_os_solicitante", columnList = "solicitante")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrdemServico extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Titulo e obrigatorio")
    @Size(max = 150)
    @Column(name = "titulo", length = 150, nullable = false)
    private String titulo;

    @Column(name = "descricao", columnDefinition = "TEXT")
    private String descricao;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "computador_id")
    private Computador computador;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "prioridade", length = 20, nullable = false)
    private PrioridadeOrdemServico prioridade = PrioridadeOrdemServico.MEDIA;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    private StatusOrdemServico status = StatusOrdemServico.ABERTA;

    @Size(max = 100)
    @Column(name = "solicitante", length = 100)
    private String solicitante;

    @Size(max = 100)
    @Column(name = "tecnico_responsavel", length = 100)
    private String tecnicoResponsavel;

    @Column(name = "data_abertura")
    private LocalDateTime dataAbertura;

    @Column(name = "data_previsao")
    private LocalDateTime dataPrevisao;

    @Column(name = "data_conclusao")
    private LocalDateTime dataConclusao;

    @Column(name = "solucao", columnDefinition = "TEXT")
    private String solucao;

    @PrePersist
    protected void onCreate() {
        if (status == null) status = StatusOrdemServico.ABERTA;
        if (prioridade == null) prioridade = PrioridadeOrdemServico.MEDIA;
        if (dataAbertura == null) dataAbertura = LocalDateTime.now();
    }
}
