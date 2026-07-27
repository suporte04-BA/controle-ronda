package com.inventario.repository;

import com.inventario.model.Computador;
import com.inventario.model.enums.StatusComputador;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ComputadorRepository extends JpaRepository<Computador, Long> {

    boolean existsByNumeroSerie(String numeroSerie);

    boolean existsByNumeroSerieAndIdNot(String numeroSerie, Long id);

    long countByStatus(StatusComputador status);

    List<Computador> findAllByOrderByIdDesc();

    @Query("SELECT c FROM Computador c WHERE " +
           "(:status IS NULL OR c.status = :status) AND " +
           "(:termo IS NULL OR LOWER(c.nomePc) LIKE LOWER(CONCAT('%',:termo,'%')) OR " +
           "LOWER(c.modeloMarca) LIKE LOWER(CONCAT('%',:termo,'%')) OR " +
           "LOWER(c.numeroSerie) LIKE LOWER(CONCAT('%',:termo,'%')) OR " +
           "LOWER(c.usuarioDesignado) LIKE LOWER(CONCAT('%',:termo,'%')) OR " +
           "LOWER(c.fornecedor) LIKE LOWER(CONCAT('%',:termo,'%')))")
    Page<Computador> filtrar(@Param("status") StatusComputador status,
                             @Param("termo") String termo,
                             Pageable pageable);

    @Query("SELECT COUNT(c) FROM Computador c WHERE c.proximaManutencao IS NOT NULL AND c.proximaManutencao < CURRENT_TIMESTAMP")
    long countManutencaoVencida();

    @Query("SELECT c.status, COUNT(c) FROM Computador c GROUP BY c.status")
    List<Object[]> countGroupByStatus();
}
