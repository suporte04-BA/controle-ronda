package com.inventario.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Username e obrigatorio")
    private String username;

    @NotBlank(message = "Senha e obrigatoria")
    private String senha;
}
