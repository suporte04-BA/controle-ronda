package com.inventario.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ManutencaoDTO {

    private Long id;

    @NotNull(message = "ID do computador e obrigatorio")
    private Long computadorId;

    private String computadorNome;

    @NotNull(message = "Tipo e obrigatorio")
    private String tipo;

    private String status;

    @NotBlank(message = "Descricao e obrigatoria")
    private String descricao;

    private String observacoes;
    private String tecnicoResponsavel;
    private LocalDateTime dataInicio;
    private LocalDateTime dataConclusao;
    private Double custo;
    private String pecasTrocadas;
}
