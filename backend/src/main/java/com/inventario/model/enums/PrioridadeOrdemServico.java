package com.inventario.model.enums;

public enum PrioridadeOrdemServico {
    BAIXA("Baixa"),
    MEDIA("Media"),
    ALTA("Alta"),
    CRITICA("Critica");

    private final String descricao;

    PrioridadeOrdemServico(String descricao) {
        this.descricao = descricao;
    }

    public String getDescricao() {
        return descricao;
    }
}
