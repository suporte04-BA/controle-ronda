package com.inventario.model;

import com.inventario.model.enums.*;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "manutencoes", indexes = {
    @Index(name = "idx_manut_computador", columnList = "computador_id"),
    @Index(name = "idx_manut_status", columnList = "status"),
    @Index(name = "idx_manut_tipo", columnList = "tipo")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Manutencao extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Computador e obrigatorio")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "computador_id", nullable = false)
    private Computador computador;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", length = 30, nullable = false)
    private TipoManutencao tipo;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    private StatusManutencao status = StatusManutencao.PENDENTE;

    @NotBlank(message = "Descricao e obrigatoria")
    @Column(name = "descricao", columnDefinition = "TEXT", nullable = false)
    private String descricao;

    @Column(name = "observacoes", columnDefinition = "TEXT")
    private String observacoes;

    @Size(max = 100)
    @Column(name = "tecnico_responsavel", length = 100)
    private String tecnicoResponsavel;

    @Column(name = "data_inicio")
    private LocalDateTime dataInicio;

    @Column(name = "data_conclusao")
    private LocalDateTime dataConclusao;

    @Column(name = "custo")
    private Double custo;

    @Column(name = "peças_trocadas", columnDefinition = "TEXT")
    private String pecasTrocadas;

    @PrePersist
    protected void onCreate() {
        if (status == null) status = StatusManutencao.PENDENTE;
    }
}
