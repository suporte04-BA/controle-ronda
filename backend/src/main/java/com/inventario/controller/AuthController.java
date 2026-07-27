package com.inventario.controller;

import com.inventario.dto.*;
import com.inventario.exception.RegraNegocioException;
import com.inventario.model.User;
import com.inventario.repository.UserRepository;
import com.inventario.security.JwtTokenProvider;
import com.inventario.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new RegraNegocioException("Credenciais invalidas"));

        if (!passwordEncoder.matches(request.getSenha(), user.getSenha())) {
            userService.registrarLoginFalha(user);
            throw new RegraNegocioException("Credenciais invalidas");
        }

        if (userService.isBloqueado(user)) {
            throw new RegraNegocioException("Conta bloqueada. Tente novamente mais tarde.");
        }

        if (!user.getAtivo()) {
            throw new RegraNegocioException("Usuario desativado");
        }

        userService.registrarLoginSucesso(user);

        String token = tokenProvider.generateToken(user.getUsername(), user.getPerfil().name(), user.getNomeCompleto());
        String refreshToken = tokenProvider.generateRefreshToken(user.getUsername());

        return ResponseEntity.ok(LoginResponse.builder()
            .token(token)
            .refreshToken(refreshToken)
            .username(user.getUsername())
            .nomeCompleto(user.getNomeCompleto())
            .perfil(user.getPerfil().name())
            .expiresIn(tokenProvider.getJwtExpiration())
            .build());
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        if (refreshToken == null || !tokenProvider.validateToken(refreshToken)) {
            throw new RegraNegocioException("Refresh token invalido");
        }

        String username = tokenProvider.getUsernameFromToken(refreshToken);
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RegraNegocioException("Usuario nao encontrado"));

        String newToken = tokenProvider.generateToken(user.getUsername(), user.getPerfil().name(), user.getNomeCompleto());

        return ResponseEntity.ok(Map.of("token", newToken, "expiresIn", tokenProvider.getJwtExpiration()));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String username = tokenProvider.getUsernameFromToken(token);
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RegraNegocioException("Usuario nao encontrado"));
        return ResponseEntity.ok(Map.of(
            "id", user.getId(),
            "username", user.getUsername(),
            "nomeCompleto", user.getNomeCompleto(),
            "perfil", user.getPerfil().name(),
            "email", user.getEmail() != null ? user.getEmail() : ""
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of("mensagem", "Logout realizado com sucesso"));
    }
}
