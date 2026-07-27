package com.inventario.controller;

import com.inventario.dto.*;
import com.inventario.service.ManutencaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/manutencoes")
@RequiredArgsConstructor
public class ManutencaoController {

    private final ManutencaoService service;

    @GetMapping
    public ResponseEntity<?> listarPaginado(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long computadorId) {
        return ResponseEntity.ok(service.listarPaginado(page, size, status, computadorId));
    }

    @GetMapping("/computador/{computadorId}")
    public ResponseEntity<?> listarPorComputador(@PathVariable Long computadorId) {
        return ResponseEntity.ok(service.listarPorComputador(computadorId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TECNICO')")
    public ResponseEntity<?> cadastrar(@Valid @RequestBody ManutencaoDTO dto) {
        return ResponseEntity.ok(service.cadastrar(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECNICO')")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @RequestBody ManutencaoDTO dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.ok(java.util.Map.of("mensagem", "Manutencao excluida com sucesso"));
    }

    @GetMapping("/estatisticas")
    public ResponseEntity<?> estatisticas() {
        return ResponseEntity.ok(service.estatisticas());
    }
}
