package com.inventario.model.enums;

public enum StatusOrdemServico {
    ABERTA("Aberta"),
    EM_ANALISE("Em Analise"),
    EM_EXECUCAO("Em Execucao"),
    CONCLUIDA("Concluida"),
    CANCELADA("Cancelada");

    private final String descricao;

    StatusOrdemServico(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
