package com.finzly.bankos.dashboard.repository;

import com.finzly.bankos.dashboard.entity.ChartConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChartConfigRepository extends JpaRepository<ChartConfig, Long> {

    List<ChartConfig> findByIsActiveTrue();

    Optional<ChartConfig> findByChartTypeAndIsActiveTrue(ChartConfig.ChartType chartType);

    List<ChartConfig> findByChartTypeInAndIsActiveTrue(List<ChartConfig.ChartType> chartTypes);
}
