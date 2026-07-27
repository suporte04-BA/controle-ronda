package com.inventario.controller;

import com.inventario.dto.UserDTO;
import com.inventario.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UserController {

    private final UserService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TECNICO')")
    public ResponseEntity<?> listar() {
        return ResponseEntity.ok(service.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<?> buscarPorUsername(@PathVariable String username) {
        return ResponseEntity.ok(service.buscarPorUsername(username));
    }

    @PostMapping
    public ResponseEntity<?> cadastrar(@Valid @RequestBody UserDTO dto) {
        return ResponseEntity.ok(service.cadastrar(dto, true));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @Valid @RequestBody UserDTO dto,
                                       Authentication auth) {
        boolean isAdmin = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return ResponseEntity.ok(service.atualizar(id, dto, isAdmin));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletar(@PathVariable Long id, Authentication auth) {
        service.deletar(id, auth.getName());
        return ResponseEntity.ok(Map.of("mensagem", "Usuario excluido com sucesso"));
    }
}
