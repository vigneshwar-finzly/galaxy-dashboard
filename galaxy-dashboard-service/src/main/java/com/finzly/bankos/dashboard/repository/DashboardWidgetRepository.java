package com.finzly.bankos.dashboard.repository;

import com.finzly.bankos.dashboard.entity.DashboardWidget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DashboardWidgetRepository extends JpaRepository<DashboardWidget, Long> {

    List<DashboardWidget> findByDashboardIdAndIsActiveTrue(Long dashboardId);

    List<DashboardWidget> findByWidgetIdAndIsActiveTrue(Long widgetId);

    Optional<DashboardWidget> findByIdAndIsActiveTrue(Long id);

    Optional<DashboardWidget> findByDashboardIdAndWidgetIdAndIsActiveTrue(Long dashboardId, Long widgetId);

    @Query("SELECT dw FROM DashboardWidget dw WHERE dw.dashboard.id = :dashboardId AND dw.isActive = true ORDER BY dw.widgetOrder ASC")
    List<DashboardWidget> findByDashboardIdOrderByWidgetOrder(@Param("dashboardId") Long dashboardId);

    @Query("SELECT COALESCE(MAX(dw.widgetOrder), 0) FROM DashboardWidget dw WHERE dw.dashboard.id = :dashboardId")
    Integer findMaxWidgetOrderByDashboardId(@Param("dashboardId") Long dashboardId);

    void deleteByDashboardIdAndWidgetId(Long dashboardId, Long widgetId);

    void deleteByDashboardId(Long dashboardId);

    void deleteByWidgetId(Long widgetId);

    @Query("SELECT COUNT(dw) FROM DashboardWidget dw WHERE dw.dashboard.id = :dashboardId AND dw.isActive = true")
    long countWidgetsByDashboardId(@Param("dashboardId") Long dashboardId);

    @Query("SELECT dw FROM DashboardWidget dw WHERE dw.dashboard.id = :dashboardId AND dw.widget.id = :widgetId AND dw.isActive = true")
    Optional<DashboardWidget> findByDashboardIdAndWidgetId(Long dashboardId, Long widgetId);
}
