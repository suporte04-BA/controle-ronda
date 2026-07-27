package com.inventario.model.enums;

public enum StatusManutencao {
    PENDENTE("Pendente"),
    EM_ANDAMENTO("Em Andamento"),
    CONCLUIDA("Concluida"),
    CANCELADA("Cancelada");

    private final String descricao;

    StatusManutencao(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
