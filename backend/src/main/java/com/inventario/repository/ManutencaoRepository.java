package com.inventario.repository;

import com.inventario.model.Manutencao;
import com.inventario.model.enums.StatusManutencao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ManutencaoRepository extends JpaRepository<Manutencao, Long> {

    List<Manutencao> findByComputadorIdOrderByDataInicioDesc(Long computadorId);

    long countByStatus(StatusManutencao status);

    @Query("SELECT m FROM Manutencao m WHERE " +
           "(:status IS NULL OR m.status = :status) AND " +
           "(:computadorId IS NULL OR m.computador.id = :computadorId)")
    Page<Manutencao> filtrar(@Param("status") StatusManutencao status,
                             @Param("computadorId") Long computadorId,
                             Pageable pageable);

    @Query("SELECT m.tipo, COUNT(m) FROM Manutencao m GROUP BY m.tipo")
    List<Object[]> countGroupByTipo();

    @Query("SELECT COALESCE(SUM(m.custo), 0) FROM Manutencao m WHERE m.custo IS NOT NULL")
    Double sumTotalCusto();
}
