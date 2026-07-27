package com.inventario.service;

import com.inventario.dto.*;
import com.inventario.exception.*;
import com.inventario.model.*;
import com.inventario.model.enums.*;
import com.inventario.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OrdemServicoService {

    private final OrdemServicoRepository repository;
    private final ComputadorRepository computadorRepository;

    public PageResponse<OrdemServicoDTO> listarPaginado(int page, int size, String status, String prioridade, Long computadorId) {
        StatusOrdemServico statusEnum = null;
        PrioridadeOrdemServico prioridadeEnum = null;
        if (status != null && !status.isEmpty()) statusEnum = StatusOrdemServico.valueOf(status);
        if (prioridade != null && !prioridade.isEmpty()) prioridadeEnum = PrioridadeOrdemServico.valueOf(prioridade);

        Page<OrdemServico> pageResult = repository.filtrar(statusEnum, prioridadeEnum, computadorId,
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));

        List<OrdemServicoDTO> content = pageResult.getContent().stream()
            .map(this::toDTO).toList();

        return PageResponse.<OrdemServicoDTO>builder()
            .content(content)
            .page(pageResult.getNumber())
            .size(pageResult.getSize())
            .totalElements(pageResult.getTotalElements())
            .totalPages(pageResult.getTotalPages())
            .build();
    }

    public OrdemServicoDTO buscarPorId(Long id) {
        OrdemServico o = repository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Ordem de Servico", id));
        return toDTO(o);
    }

    @Transactional
    public OrdemServicoDTO cadastrar(OrdemServicoDTO dto) {
        OrdemServico o = new OrdemServico();
        o.setTitulo(dto.getTitulo());
        o.setDescricao(dto.getDescricao());
        o.setSolicitante(dto.getSolicitante());
        o.setTecnicoResponsavel(dto.getTecnicoResponsavel());
        o.setDataPrevisao(dto.getDataPrevisao());

        if (dto.getPrioridade() != null) {
            o.setPrioridade(PrioridadeOrdemServico.valueOf(dto.getPrioridade()));
        }
        if (dto.getComputadorId() != null) {
            Computador c = computadorRepository.findById(dto.getComputadorId())
                .orElseThrow(() -> new RecursoNaoEncontradoException("Computador", dto.getComputadorId()));
            o.setComputador(c);
        }

        return toDTO(repository.save(o));
    }

    @Transactional
    public OrdemServicoDTO atualizar(Long id, OrdemServicoDTO dto) {
        OrdemServico o = repository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Ordem de Servico", id));

        if (dto.getTitulo() != null) o.setTitulo(dto.getTitulo());
        if (dto.getDescricao() != null) o.setDescricao(dto.getDescricao());
        if (dto.getSolicitante() != null) o.setSolicitante(dto.getSolicitante());
        if (dto.getTecnicoResponsavel() != null) o.setTecnicoResponsavel(dto.getTecnicoResponsavel());
        if (dto.getDataPrevisao() != null) o.setDataPrevisao(dto.getDataPrevisao());
        if (dto.getSolucao() != null) o.setSolucao(dto.getSolucao());

        if (dto.getStatus() != null) {
            StatusOrdemServico newStatus = StatusOrdemServico.valueOf(dto.getStatus());
            o.setStatus(newStatus);
            if (newStatus == StatusOrdemServico.CONCLUIDA) {
                o.setDataConclusao(LocalDateTime.now());
            }
        }
        if (dto.getPrioridade() != null) {
            o.setPrioridade(PrioridadeOrdemServico.valueOf(dto.getPrioridade()));
        }

        return toDTO(repository.save(o));
    }

    @Transactional
    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Ordem de Servico", id);
        }
        repository.deleteById(id);
    }

    public Map<String, Object> estatisticas() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", repository.count());
        stats.put("abertas", repository.countByStatus(StatusOrdemServico.ABERTA));
        stats.put("emAnalise", repository.countByStatus(StatusOrdemServico.EM_ANALISE));
        stats.put("emExecucao", repository.countByStatus(StatusOrdemServico.EM_EXECUCAO));
        stats.put("concluidas", repository.countByStatus(StatusOrdemServico.CONCLUIDA));
        stats.put("canceladas", repository.countByStatus(StatusOrdemServico.CANCELADA));

        List<Object[]> byPrioridade = repository.countGroupByPrioridade();
        Map<String, Long> porPrioridade = new LinkedHashMap<>();
        byPrioridade.forEach(row -> porPrioridade.put(((PrioridadeOrdemServico) row[0]).name(), (Long) row[1]));
        stats.put("porPrioridade", porPrioridade);

        return stats;
    }

    private OrdemServicoDTO toDTO(OrdemServico o) {
        return OrdemServicoDTO.builder()
            .id(o.getId())
            .titulo(o.getTitulo())
            .descricao(o.getDescricao())
            .computadorId(o.getComputador() != null ? o.getComputador().getId() : null)
            .computadorNome(o.getComputador() != null ? o.getComputador().getNomePc() : null)
            .prioridade(o.getPrioridade().name())
            .status(o.getStatus().name())
            .solicitante(o.getSolicitante())
            .tecnicoResponsavel(o.getTecnicoResponsavel())
            .dataAbertura(o.getDataAbertura())
            .dataPrevisao(o.getDataPrevisao())
            .dataConclusao(o.getDataConclusao())
            .solucao(o.getSolucao())
            .build();
    }
}
