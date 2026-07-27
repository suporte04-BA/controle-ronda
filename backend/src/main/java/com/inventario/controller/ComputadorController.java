package com.inventario.controller;

import com.inventario.dto.*;
import com.inventario.service.ComputadorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/computadores")
@RequiredArgsConstructor
public class ComputadorController {

    private final ComputadorService service;

    @GetMapping
    public ResponseEntity<?> listar() {
        return ResponseEntity.ok(service.listarTodos());
    }

    @GetMapping("/paginado")
    public ResponseEntity<?> listarPaginado(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String termo) {
        return ResponseEntity.ok(service.listarPaginado(page, size, status, termo));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TECNICO')")
    public ResponseEntity<?> cadastrar(@Valid @RequestBody ComputadorDTO dto) {
        return ResponseEntity.ok(service.cadastrar(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECNICO')")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @Valid @RequestBody ComputadorDTO dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @PatchMapping("/{id}/manutencao")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECNICO')")
    public ResponseEntity<?> registrarManutencao(@PathVariable Long id) {
        return ResponseEntity.ok(service.registrarManutencao(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.ok(Map.of("mensagem", "Computador excluido com sucesso"));
    }

    @GetMapping("/estatisticas")
    public ResponseEntity<?> estatisticas() {
        return ResponseEntity.ok(service.estatisticas());
    }
}
