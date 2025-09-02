package com.finzly.bankos.dashboard.repository;

import com.finzly.bankos.dashboard.entity.Widget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WidgetRepository extends JpaRepository<Widget, Long> {

    List<Widget> findByIsActiveTrue();

    List<Widget> findByCreatedByAndIsActiveTrue(String createdBy);

    Optional<Widget> findByIdAndIsActiveTrue(Long id);

    List<Widget> findByChartTypeAndIsActiveTrue(Widget.ChartType chartType);

    List<Widget> findByDataSourceAndIsActiveTrue(String dataSource);

    List<Widget> findByNameContainingIgnoreCaseAndIsActiveTrue(String name);

    @Query("SELECT w FROM Widget w WHERE w.isActive = true AND " +
           "(w.createdBy = :userId OR " +
           "EXISTS (SELECT 1 FROM DashboardWidget dw JOIN dw.dashboard d WHERE dw.widget = w AND " +
           "(d.viewerType = 'GLOBAL' OR " +
           "(d.viewerType = 'PRIVATE' AND d.createdBy = :userId) OR " +
           "EXISTS (SELECT 1 FROM DashboardUserPermission p WHERE p.dashboard = d AND " +
           "(p.userId = :userId OR p.departmentId = :departmentId) AND p.permissionType = 'VIEWER'))))")
    List<Widget> findVisibleWidgets(@Param("userId") String userId, @Param("departmentId") String departmentId);

    @Query("SELECT COUNT(w) FROM Widget w WHERE w.isActive = true")
    long countActiveWidgets();
}
