package com.inventario.service;

import com.inventario.dto.UserDTO;
import com.inventario.exception.*;
import com.inventario.model.User;
import com.inventario.model.enums.PerfilUsuario;
import com.inventario.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;

    public List<UserDTO> listarTodos() {
        return repository.findAllByOrderByIdAsc().stream().map(this::toDTO).toList();
    }

    public UserDTO buscarPorId(Long id) {
        User u = repository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuario", id));
        return toDTO(u);
    }

    public UserDTO buscarPorUsername(String username) {
        User u = repository.findByUsername(username)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuario: " + username));
        return toDTO(u);
    }

    @Transactional
    public UserDTO cadastrar(UserDTO dto, boolean isPublicRegistration) {
        if (repository.existsByUsername(dto.getUsername())) {
            throw new RegraNegocioException("Username ja cadastrado");
        }
        if (dto.getEmail() != null && repository.existsByEmail(dto.getEmail())) {
            throw new RegraNegocioException("Email ja cadastrado");
        }
        if (dto.getSenha() == null || dto.getSenha().length() < 6) {
            throw new RegraNegocioException("Senha deve ter no minimo 6 caracteres");
        }

        User user = new User();
        user.setUsername(dto.getUsername());
        user.setSenha(passwordEncoder.encode(dto.getSenha()));
        user.setNomeCompleto(dto.getNomeCompleto());
        user.setEmail(dto.getEmail());

        if (isPublicRegistration) {
            user.setPerfil(PerfilUsuario.USUARIO);
        } else if (dto.getPerfil() != null) {
            user.setPerfil(PerfilUsuario.valueOf(dto.getPerfil()));
        }

        user.setFotoUrl(dto.getFotoUrl());
        return toDTO(repository.save(user));
    }

    @Transactional
    public UserDTO atualizar(Long id, UserDTO dto, boolean isAdmin) {
        User user = repository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuario", id));

        if (dto.getNomeCompleto() != null) user.setNomeCompleto(dto.getNomeCompleto());
        if (dto.getEmail() != null) user.setEmail(dto.getEmail());
        if (dto.getFotoUrl() != null) user.setFotoUrl(dto.getFotoUrl());
        if (dto.getAtivo() != null) user.setAtivo(dto.getAtivo());

        if (isAdmin && dto.getPerfil() != null) {
            user.setPerfil(PerfilUsuario.valueOf(dto.getPerfil()));
        }
        if (dto.getSenha() != null && !dto.getSenha().isEmpty()) {
            if (dto.getSenha().length() < 6) {
                throw new RegraNegocioException("Senha deve ter no minimo 6 caracteres");
            }
            user.setSenha(passwordEncoder.encode(dto.getSenha()));
        }

        return toDTO(repository.save(user));
    }

    @Transactional
    public void deletar(Long id, String currentUsername) {
        User user = repository.findById(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuario", id));
        if (user.getUsername().equals(currentUsername)) {
            throw new RegraNegocioException("Nao e possivel excluir seu proprio usuario");
        }
        repository.deleteById(id);
    }

    @Transactional
    public void registrarLoginSucesso(User user) {
        user.setTentativasLogin(0);
        user.setBloqueadoAte(null);
        user.setUltimoLogin(LocalDateTime.now());
        repository.save(user);
    }

    @Transactional
    public void registrarLoginFalha(User user) {
        int tentativas = (user.getTentativasLogin() != null ? user.getTentativasLogin() : 0) + 1;
        user.setTentativasLogin(tentativas);
        if (tentativas >= 5) {
            user.setBloqueadoAte(LocalDateTime.now().plusMinutes(15));
        }
        repository.save(user);
    }

    public boolean isBloqueado(User user) {
        return user.getBloqueadoAte() != null && user.getBloqueadoAte().isAfter(LocalDateTime.now());
    }

    private UserDTO toDTO(User u) {
        return UserDTO.builder()
            .id(u.getId())
            .username(u.getUsername())
            .nomeCompleto(u.getNomeCompleto())
            .email(u.getEmail())
            .perfil(u.getPerfil().name())
            .fotoUrl(u.getFotoUrl())
            .ativo(u.getAtivo())
            .build();
    }
}
