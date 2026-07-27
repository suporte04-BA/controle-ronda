package com.inventario.config;

import com.inventario.model.Computador;
import com.inventario.model.User;
import com.inventario.model.enums.PerfilUsuario;
import com.inventario.model.enums.StatusComputador;
import com.inventario.repository.ComputadorRepository;
import com.inventario.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ComputadorRepository computadorRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() == 0) {
            log.info("Criando usuarios iniciais...");
            createUser("admin", "admin123", "Administrador", "admin@baeletrica.com", PerfilUsuario.ADMIN);
            createUser("tecnico", "tecnico123", "Tecnico de TI", "tecnico@baeletrica.com", PerfilUsuario.TECNICO);
            createUser("usuario", "usuario123", "Usuario Comum", "usuario@baeletrica.com", PerfilUsuario.USUARIO);
            createUser("joao.silva", "joao123", "Joao Silva", "joao@baeletrica.com", PerfilUsuario.USUARIO);
            createUser("maria.santos", "maria123", "Maria Santos", "maria@baeletrica.com", PerfilUsuario.USUARIO);
            createUser("pedro.costa", "pedro123", "Pedro Costa", "pedro@baeletrica.com", PerfilUsuario.TECNICO);
            createUser("ana.oliveira", "ana123", "Ana Oliveira", "ana@baeletrica.com", PerfilUsuario.USUARIO);
            createUser("carlos.pereira", "carlos123", "Carlos Pereira", "carlos@baeletrica.com", PerfilUsuario.TECNICO);
            createUser("lucia.ferreira", "lucia123", "Lucia Ferreira", "lucia@baeletrica.com", PerfilUsuario.USUARIO);
            log.info("9 usuarios criados com sucesso!");
        }

        if (computadorRepository.count() == 0) {
            log.info("Criando equipamentos iniciais...");
            createComputador("PC-TI-001", "SN-2024-001", "Dell Optiplex 7090", "Intel Core i7-11700", "16GB", "512GB SSD", "Joao Silva", "Dell", StatusComputador.ATIVO);
            createComputador("PC-TI-002", "SN-2024-002", "HP ProDesk 400 G7", "Intel Core i5-10500", "8GB", "256GB SSD", "Maria Santos", "HP", StatusComputador.ATIVO);
            createComputador("PC-TI-003", "SN-2024-003", "Lenovo ThinkCentre M70s", "Intel Core i5-11500", "16GB", "512GB SSD", "Pedro Costa", "Lenovo", StatusComputador.MANUTENCAO_PREVENTIVA);
            createComputador("PC-TI-004", "SN-2024-004", "Dell Latitude 5520", "Intel Core i7-1165G7", "16GB", "1TB SSD", "Ana Oliveira", "Dell", StatusComputador.ATIVO);
            createComputador("PC-TI-005", "SN-2024-005", "HP EliteDesk 800 G5", "Intel Core i7-9700", "32GB", "512GB SSD", "Carlos Pereira", "HP", StatusComputador.MANUTENCAO_EMERGENCIAL);
            createComputador("PC-TI-006", "SN-2024-006", "Lenovo ThinkPad T480", "Intel Core i5-8250U", "8GB", "256GB SSD", "Lucia Ferreira", "Lenovo", StatusComputador.ATIVO);
            createComputador("PC-TI-007", "SN-2024-007", "Acer Aspire TC-780", "Intel Core i3-7100", "4GB", "1TB HDD", "Roberto Almeida", "Acer", StatusComputador.MANUTENCAO_PREDITIVA);
            createComputador("PC-TI-008", "SN-2024-008", "Dell Inspiron 3670", "Intel Core i5-8400", "8GB", "1TB HDD", "Fernanda Lima", "Dell", StatusComputador.ATIVO);
            createComputador("PC-TI-009", "SN-2024-009", "HP Pavilion 590", "Intel Core i5-8500", "12GB", "256GB SSD + 1TB HDD", "Ricardo Souza", "HP", StatusComputador.CONCLUIDO);
            createComputador("PC-TI-010", "SN-2024-010", "Lenovo IdeaCentre 510", "AMD Ryzen 5 3600", "8GB", "512GB SSD", "Juliana Martins", "Lenovo", StatusComputador.ATIVO);
            createComputador("PC-TI-011", "SN-2024-011", "Dell OptiPlex 3080", "Intel Core i3-10100", "4GB", "128GB SSD", "Marcos Ribeiro", "Dell", StatusComputador.MANUTENCAO_PREVENTIVA);
            createComputador("PC-TI-012", "SN-2024-012", "HP ProBook 450 G7", "Intel Core i5-10210U", "8GB", "512GB SSD", "Patricia Gomes", "HP", StatusComputador.ATIVO);
            createComputador("PC-TI-013", "SN-2024-013", "Lenovo V530", "Intel Core i7-8700", "16GB", "256GB SSD", "Thiago Nunes", "Lenovo", StatusComputador.MANUTENCAO_EMERGENCIAL);
            createComputador("PC-TI-014", "SN-2024-014", "Acer Veriton M4660G", "Intel Core i5-9400", "8GB", "1TB HDD", "Camila Araujo", "Acer", StatusComputador.ATIVO);
            createComputador("PC-TI-015", "SN-2024-015", "Dell Vostro 3670", "Intel Core i3-9100", "4GB", "1TB HDD", "Eduardo Barbosa", "Dell", StatusComputador.CONCLUIDO);
            createComputador("PC-TI-016", "SN-2024-016", "HP 280 G3", "Intel Core i5-8500", "8GB", "256GB SSD", "Vanessa Dias", "HP", StatusComputador.ATIVO);
            createComputador("PC-TI-017", "SN-2024-017", "Lenovo ThinkCentre M920t", "Intel Core i7-8700", "32GB", "512GB SSD", "Leonardo Cardoso", "Lenovo", StatusComputador.MANUTENCAO_PREDITIVA);
            createComputador("PC-TI-018", "SN-2024-018", "Dell Precision 3630", "Intel Xeon E-2124", "16GB", "256GB SSD", "Amanda Rocha", "Dell", StatusComputador.ATIVO);
            createComputador("PC-TI-019", "SN-2024-019", "HP Z240 Tower", "Intel Core i5-7500", "8GB", "512GB SSD", "Bruno Carvalho", "HP", StatusComputador.MANUTENCAO_PREVENTIVA);
            createComputador("PC-TI-020", "SN-2024-020", "Lenovo ThinkStation P330", "Intel Core i7-8700", "32GB", "1TB SSD", "Sabrina Melo", "Lenovo", StatusComputador.ATIVO);
            log.info("20 equipamentos criados com sucesso!");
        }
    }

    private void createUser(String username, String senha, String nome, String email, PerfilUsuario perfil) {
        User user = User.builder()
            .username(username)
            .senha(passwordEncoder.encode(senha))
            .nomeCompleto(nome)
            .email(email)
            .perfil(perfil)
            .ativo(true)
            .tentativasLogin(0)
            .build();
        userRepository.save(user);
    }

    private void createComputador(String nomePc, String numeroSerie, String modeloMarca, String processador,
                                   String memoriaRam, String armazenamento, String usuarioDesignado,
                                   String fornecedor, StatusComputador status) {
        Computador c = Computador.builder()
            .nomePc(nomePc)
            .numeroSerie(numeroSerie)
            .modeloMarca(modeloMarca)
            .processador(processador)
            .memoriaRam(memoriaRam)
            .armazenamento(armazenamento)
            .usuarioDesignado(usuarioDesignado)
            .fornecedor(fornecedor)
            .status(status)
            .manutencaoConcluidaSemestre(false)
            .build();
        computadorRepository.save(c);
    }
}
