package com.inventario.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrdemServicoDTO {

    private Long id;

    @NotBlank(message = "Titulo e obrigatorio")
    @Size(max = 150)
    private String titulo;

    private String descricao;

    private Long computadorId;
    private String computadorNome;

    private String prioridade;
    private String status;

    private String solicitante;
    private String tecnicoResponsavel;
    private LocalDateTime dataAbertura;
    private LocalDateTime dataPrevisao;
    private LocalDateTime dataConclusao;
    private String solucao;
}
