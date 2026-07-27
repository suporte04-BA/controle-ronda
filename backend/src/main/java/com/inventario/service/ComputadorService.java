package com.inventario.service;

import com.inventario.dto.*;
import com.inventario.exception.*;
import com.inventario.model.Computador;
import com.inventario.model.enums.StatusComputador;
import com.inventario.repository.ComputadorRepository;
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
public class ComputadorService {

    private final ComputadorRepository repository;

    public PageResponse<ComputadorDTO> listarPaginado(int page, int size, String status, String termo) {
        StatusComputador statusEnum = null;
        if (status != null && !status.isEmpty()) {
            statusEnum = StatusComputador.valueOf(status);
        }
        Page<Computador> pageResult = repository.filtrar(statusEnum, termo,
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));

        List<ComputadorDTO> content = pageResult.getContent().stream()
            .map(this::toDTO).toList();

        return PageResponse.<ComputadorDTO>builder()
            .content(content)
            .page(pageResult.getNumber())
            .size(pageResult.getSize())
            .totalElements(pageResult.getTotalElements())
            .totalPages(pageResult.getTotalPages())
            .build();
    }

    public List<ComputadorDTO> listarTodos() {
        return repository.findAllByOrderByIdDesc().stream()
            .map(this::toDTO).toList();
    }

    public ComputadorDTO buscarPorId(Long id) {
        Computador c = repository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Computador", id));
        return toDTO(c);
    }

    @Transactional
    public ComputadorDTO cadastrar(ComputadorDTO dto) {
        if (repository.existsByNumeroSerie(dto.getNumeroSerie())) {
            throw new RegraNegocioException("Numero de serie ja cadastrado");
        }
        Computador entity = toEntity(dto);
        entity.setId(null);
        return toDTO(repository.save(entity));
    }

    @Transactional
    public ComputadorDTO atualizar(Long id, ComputadorDTO dto) {
        Computador existing = repository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Computador", id));

        if (!existing.getNumeroSerie().equals(dto.getNumeroSerie()) &&
            repository.existsByNumeroSerieAndIdNot(dto.getNumeroSerie(), id)) {
            throw new RegraNegocioException("Numero de serie ja cadastrado");
        }

        existing.setNomePc(dto.getNomePc());
        existing.setNumeroSerie(dto.getNumeroSerie());
        existing.setModeloMarca(dto.getModeloMarca());
        existing.setProcessador(dto.getProcessador());
        existing.setMemoriaRam(dto.getMemoriaRam());
        existing.setArmazenamento(dto.getArmazenamento());
        existing.setUsuarioDesignado(dto.getUsuarioDesignado() != null ? dto.getUsuarioDesignado() : "");
        existing.setFornecedor(dto.getFornecedor());
        existing.setFotoUrl(dto.getFotoUrl());

        if (dto.getStatus() != null) {
            StatusComputador newStatus = StatusComputador.valueOf(dto.getStatus());
            existing.setStatus(newStatus);
            if (newStatus == StatusComputador.CONCLUIDO) {
                existing.setDataUltimaManutencao(LocalDateTime.now());
                existing.setManutencaoConcluidaSemestre(true);
                existing.setProximaManutencao(LocalDateTime.now().plusMonths(6));
            }
        }

        return toDTO(repository.save(existing));
    }

    @Transactional
    public ComputadorDTO registrarManutencao(Long id) {
        Computador c = repository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Computador", id));
        c.setDataUltimaManutencao(LocalDateTime.now());
        c.setManutencaoConcluidaSemestre(true);
        c.setProximaManutencao(LocalDateTime.now().plusMonths(6));
        if (c.getStatus() == StatusComputador.MANUTENCAO_EMERGENCIAL) {
            c.setStatus(StatusComputador.CONCLUIDO);
        }
        return toDTO(repository.save(c));
    }

    @Transactional
    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new RecursoNaoEncontradoException("Computador", id);
        }
        repository.deleteById(id);
    }

    public Map<String, Object> estatisticas() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", repository.count());
        stats.put("ativos", repository.countByStatus(StatusComputador.ATIVO));
        stats.put("manutencaoPreditiva", repository.countByStatus(StatusComputador.MANUTENCAO_PREDITIVA));
        stats.put("manutencaoPreventiva", repository.countByStatus(StatusComputador.MANUTENCAO_PREVENTIVA));
        stats.put("manutencaoEmergencial", repository.countByStatus(StatusComputador.MANUTENCAO_EMERGENCIAL));
        stats.put("concluidos", repository.countByStatus(StatusComputador.CONCLUIDO));
        stats.put("manutencaoVencida", repository.countManutencaoVencida());

        List<Object[]> byStatus = repository.countGroupByStatus();
        Map<String, Long> porStatus = new LinkedHashMap<>();
        byStatus.forEach(row -> porStatus.put(((StatusComputador) row[0]).name(), (Long) row[1]));
        stats.put("porStatus", porStatus);

        return stats;
    }

    private ComputadorDTO toDTO(Computador c) {
        return ComputadorDTO.builder()
            .id(c.getId())
            .nomePc(c.getNomePc())
            .numeroSerie(c.getNumeroSerie())
            .modeloMarca(c.getModeloMarca())
            .processador(c.getProcessador())
            .memoriaRam(c.getMemoriaRam())
            .armazenamento(c.getArmazenamento())
            .usuarioDesignado(c.getUsuarioDesignado())
            .fornecedor(c.getFornecedor())
            .status(c.getStatus().name())
            .fotoUrl(c.getFotoUrl())
            .manutencaoConcluidaSemestre(c.getManutencaoConcluidaSemestre())
            .build();
    }

    private Computador toEntity(ComputadorDTO dto) {
        Computador c = new Computador();
        c.setNomePc(dto.getNomePc());
        c.setNumeroSerie(dto.getNumeroSerie());
        c.setModeloMarca(dto.getModeloMarca());
        c.setProcessador(dto.getProcessador());
        c.setMemoriaRam(dto.getMemoriaRam());
        c.setArmazenamento(dto.getArmazenamento());
        c.setUsuarioDesignado(dto.getUsuarioDesignado() != null ? dto.getUsuarioDesignado() : "");
        c.setFornecedor(dto.getFornecedor());
        c.setFotoUrl(dto.getFotoUrl());
        if (dto.getStatus() != null) {
            c.setStatus(StatusComputador.valueOf(dto.getStatus()));
        }
        return c;
    }
}
