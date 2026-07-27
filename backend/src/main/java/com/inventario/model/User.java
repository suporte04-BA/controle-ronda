package com.inventario.model;

import com.inventario.model.enums.PerfilUsuario;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "usuarios", indexes = {
    @Index(name = "idx_username", columnList = "username", unique = true),
    @Index(name = "idx_email_usuario", columnList = "email")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Username e obrigatorio")
    @Size(min = 3, max = 50)
    @Column(name = "username", length = 50, nullable = false, unique = true)
    private String username;

    @NotBlank(message = "Senha e obrigatoria")
    @Size(min = 6, message = "Senha deve ter no minimo 6 caracteres")
    @Column(name = "senha", nullable = false)
    private String senha;

    @NotBlank(message = "Nome completo e obrigatorio")
    @Size(max = 100)
    @Column(name = "nome_completo", length = 100, nullable = false)
    private String nomeCompleto;

    @Email(message = "Email invalido")
    @Column(name = "email", length = 100)
    private String email;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "perfil", length = 20, nullable = false)
    private PerfilUsuario perfil = PerfilUsuario.USUARIO;

    @Column(name = "foto_url", columnDefinition = "TEXT")
    private String fotoUrl;

    @Column(name = "ativo")
    private Boolean ativo = true;

    @Column(name = "ultimo_login")
    private LocalDateTime ultimoLogin;

    @Column(name = "tentativas_login")
    private Integer tentativasLogin = 0;

    @Column(name = "bloqueado_ate")
    private LocalDateTime bloqueadoAte;

    @PrePersist
    protected void onCreate() {
        if (ativo == null) ativo = true;
        if (tentativasLogin == null) tentativasLogin = 0;
        if (perfil == null) perfil = PerfilUsuario.USUARIO;
    }
}
