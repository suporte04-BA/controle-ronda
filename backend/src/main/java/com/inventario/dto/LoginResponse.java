package com.inventario.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoginResponse {

    private String token;
    private String refreshToken;
    private String tipo = "Bearer";
    private String username;
    private String nomeCompleto;
    private String perfil;
    private Long expiresIn;
}
