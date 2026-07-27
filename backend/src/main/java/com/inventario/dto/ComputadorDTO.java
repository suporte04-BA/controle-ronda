package com.inventario.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComputadorDTO {

    private Long id;

    @NotBlank(message = "Nome do PC e obrigatorio")
    @Size(max = 100)
    private String nomePc;

    @NotBlank(message = "Numero de serie e obrigatorio")
    @Size(max = 50)
    private String numeroSerie;

    @NotBlank(message = "Modelo/Marca e obrigatorio")
    @Size(max = 100)
    private String modeloMarca;

    @NotBlank(message = "Processador e obrigatorio")
    @Size(max = 100)
    private String processador;

    @NotBlank(message = "Memoria RAM e obrigatoria")
    @Size(max = 50)
    private String memoriaRam;

    @NotBlank(message = "Armazenamento e obrigatorio")
    @Size(max = 50)
    private String armazenamento;

    @Size(max = 100)
    private String usuarioDesignado;

    @Size(max = 100)
    private String fornecedor;

    private String status;
    private String fotoUrl;
    private Boolean manutencaoConcluidaSemestre;
}
