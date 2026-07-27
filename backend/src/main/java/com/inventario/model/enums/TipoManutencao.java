package com.inventario.model.enums;

public enum TipoManutencao {
    CORRETIVA("Corretiva"),
    PREVENTIVA("Preventiva"),
    PREDITIVA("Preditiva"),
    EMERGENCIAL("Emergencial");

    private final String descricao;

    TipoManutencao(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
