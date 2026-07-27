package com.inventario.model.enums;

import org.springframework.security.core.GrantedAuthority;

public enum PerfilUsuario implements GrantedAuthority {
    ADMIN("Administrador"),
    TECNICO("Tecnico"),
    USUARIO("Usuario");

    private final String descricao;

    PerfilUsuario(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }

    @Override
    public String getAuthority() {
        return "ROLE_" + name();
    }
}
