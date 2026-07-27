package com.inventario.model.enums;

public enum StatusComputador {
    ATIVO("Ativo"),
    MANUTENCAO_PREDITIVA("Manutencao Preditiva"),
    MANUTENCAO_PREVENTIVA("Manutencao Preventiva"),
    MANUTENCAO_EMERGENCIAL("Manutencao Emergencial"),
    CONCLUIDO("Concluido");

    private final String descricao;

    StatusComputador(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
