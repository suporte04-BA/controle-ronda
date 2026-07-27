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
import java.util.*;

@Service
@RequiredArgsConstructor
public class ManutencaoService {

    private final ManutencaoRepository repository;
    private final ComputadorRepository computadorRepository;

    public PageResponse<ManutencaoDTO> listarPaginado(int page, int size, String status, Long computadorId) {
        StatusManutencao statusEnum = null;
        if (status != null && !status.isEmpty()) {
            statusEnum = StatusManutencao.valueOf(status);
        }
        Page<Manutencao> pageResult = repository.filtrar(statusEnum, computadorId,
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));

        List<ManutencaoDTO> content = pageResult.getContent().stream()
            .map(this::toDTO).toList();

        return PageResponse.<ManutencaoDTO>builder()
            .content(content)
            .page(pageResult.getNumber())
            .size(pageResult.getSize())
            .totalElements(pageResult.getTotalElements())
            .totalPages(pageResult.getTotalPages())
            .build();
    }

    public List<ManutencaoDTO> listarPorComputador(Long computadorId) {
        return repository.findByComputadorIdOrderByDataInicioDesc(computadorId).stream()
            .map(this::toDTO).toList();
    }

    public ManutencaoDTO buscarPorId(Long id) {
        Manutencao m = repository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Manutencao", id));
        return toDTO(m);
    }

    @Transactional
    public ManutencaoDTO cadastrar(ManutencaoDTO dto) {
        Computador computador = computadorRepository.findById(dto.getComputadorId())
            .orElseThrow(() -> new RecursoNaoEncontradoException("Computador", dto.getComputadorId()));

        Manutencao m = new Manutencao();
        m.setComputador(computador);
        m.setTipo(TipoManutencao.valueOf(dto.getTipo()));
        m.setDescricao(dto.getDescricao());
        m.setObservacoes(dto.getObservacoes());
        m.setTecnicoResponsavel(dto.getTecnicoResponsavel());
        m.setCusto(dto.getCusto());
        m.setPecasTrocadas(dto.getPecasTrocadas());

        if (dto.getStatus() != null) {
            m.setStatus(StatusManutencao.valueOf(dto.getStatus()));
        }

        return toDTO(repository.save(m));
    }

    @Transactional
    public ManutencaoDTO atualizar(Long id, ManutencaoDTO dto) {
        Manutencao m = repository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Manutencao", id));

        if (dto.getTipo() != null) m.setTipo(TipoManutencao.valueOf(dto.getTipo()));
        if (dto.getStatus() != null) {
            StatusManutencao newStatus = StatusManutencao.valueOf(dto.getStatus());
            m.setStatus(newStatus);
            if (newStatus == StatusManutencao.EM_ANDAMENTO && m.getDataInicio() == null) {
                m.setDataInicio(java.time.LocalDateTime.now());
            }
            if (newStatus == StatusManutencao.CONCLUIDA) {
                m.setDataConclusao(java.time.LocalDateTime.now());
            }
        }
        if (dto.getDescricao() != null) m.setDescricao(dto.getDescricao());
        if (dto.getObservacoes() != null) m.setObservacoes(dto.getObservacoes());
        if (dto.getTecnicoResponsavel() != null) m.setTecnicoResponsavel(dto.getTecnicoResponsavel());
        if (dto.getCusto() != null) m.setCusto(dto.getCusto());
        if (dto.getPecasTrocadas() != null) m.setPecasTrocadas(dto.getPecasTrocadas());

        return toDTO(repository.save(m));
    }

    @Transactional
    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Manutencao", id);
        }
        repository.deleteById(id);
    }

    public Map<String, Object> estatisticas() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", repository.count());
        stats.put("pendentes", repository.countByStatus(StatusManutencao.PENDENTE));
        stats.put("emAndamento", repository.countByStatus(StatusManutencao.EM_ANDAMENTO));
        stats.put("concluidas", repository.countByStatus(StatusManutencao.CONCLUIDA));
        stats.put("canceladas", repository.countByStatus(StatusManutencao.CANCELADA));
        stats.put("custoTotal", repository.sumTotalCusto());

        List<Object[]> byTipo = repository.countGroupByTipo();
        Map<String, Long> porTipo = new LinkedHashMap<>();
        byTipo.forEach(row -> porTipo.put(((TipoManutencao) row[0]).name(), (Long) row[1]));
        stats.put("porTipo", porTipo);

        return stats;
    }

    private ManutencaoDTO toDTO(Manutencao m) {
        return ManutencaoDTO.builder()
            .id(m.getId())
            .computadorId(m.getComputador().getId())
            .computadorNome(m.getComputador().getNomePc())
            .tipo(m.getTipo().name())
            .status(m.getStatus().name())
            .descricao(m.getDescricao())
            .observacoes(m.getObservacoes())
            .tecnicoResponsavel(m.getTecnicoResponsavel())
            .dataInicio(m.getDataInicio())
            .dataConclusao(m.getDataConclusao())
            .custo(m.getCusto())
            .pecasTrocadas(m.getPecasTrocadas())
            .build();
    }
}
